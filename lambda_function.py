import json
import logging
import os
import time
import boto3
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger()
logger.setLevel(logging.INFO)

secrets_client = boto3.client("secretsmanager")

DYNAMODB_TABLE = os.environ.get(
    "DYNAMODB_TABLE",
    "UserSubscription-am4o5w4fdfbiflmztjnv4saobi-dev",
)

dynamodb = boto3.resource("dynamodb", region_name="ap-northeast-1")
FCM_URL = "https://fcm.googleapis.com/v1/projects/donnatokiimo-6e7be/messages:send"
FCM_SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]
SECRET_NAME = os.environ.get("SECRET_NAME", "firebase-service-account")

# AppSync 設定（環境変数で上書き可能）
APPSYNC_ENDPOINT = os.environ.get(
    "APPSYNC_ENDPOINT",
    "https://fliomdzyc5erhbr35jafl6o4q4.appsync-api.ap-northeast-1.amazonaws.com/graphql",
)
APPSYNC_API_KEY = os.environ.get("APPSYNC_API_KEY", "da2-g7dzoznkhjfzzhk46z6xgz4sfy")

LIST_USER_SUBSCRIPTIONS = """
query ListUserSubscriptions($limit: Int, $nextToken: String) {
  listUserSubscriptions(limit: $limit, nextToken: $nextToken) {
    items {
      id
      subscription
    }
    nextToken
  }
}
"""

NOTIFICATION_COOLDOWN_SECONDS = 300  # 5分間は同一デバイスの重複通知を防ぐ


def try_acquire_notification_lock(device_id):
    """
    DynamoDB に通知ロックを書き込む。
    既にクールダウン中なら False を返し、取得できた場合のみ True を返す。
    5つの Lambda が同時に起動しても1つだけ通知を送るために使用。
    """
    table = dynamodb.Table(DYNAMODB_TABLE)
    now = int(time.time())
    lock_id = f"NOTIFICATION_LOCK_{device_id}"

    try:
        table.put_item(
            Item={
                "id": lock_id,
                "subscription": "LOCK",
                "expiresAt": now + NOTIFICATION_COOLDOWN_SECONDS,
            },
            ConditionExpression=(
                "attribute_not_exists(id) OR #exp < :now"
            ),
            ExpressionAttributeNames={"#exp": "expiresAt"},
            ExpressionAttributeValues={":now": now},
        )
        return True  # ロック取得成功
    except Exception as e:
        if "ConditionalCheckFailedException" in str(e):
            logger.info(f"通知クールダウン中のためスキップ: device_id={device_id}")
            return False
        raise  # 予期しないエラーは再送出

# コールドスタート間でクレデンシャルをキャッシュ
_credentials = None


def get_access_token():
    global _credentials
    from google.oauth2 import service_account
    import google.auth.transport.requests

    if _credentials is None:
        secret = secrets_client.get_secret_value(SecretId=SECRET_NAME)
        sa_info = json.loads(secret["SecretString"])
        _credentials = service_account.Credentials.from_service_account_info(
            sa_info, scopes=FCM_SCOPES
        )

    if not _credentials.valid:
        _credentials.refresh(google.auth.transport.requests.Request())

    return _credentials.token


def get_all_fcm_tokens():
    """DynamoDB から全 UserSubscription の FCM トークンと ID を取得する（重複排除済み）"""
    table = dynamodb.Table(DYNAMODB_TABLE)
    # token -> DynamoDB item id のマッピング（重複排除 + 削除用 ID 保持）
    token_to_id = {}
    scan_kwargs = {
        "ProjectionExpression": "id, #sub",
        "ExpressionAttributeNames": {"#sub": "subscription"},
        "FilterExpression": "#sub <> :lock",
        "ExpressionAttributeValues": {":lock": "LOCK"},
    }

    while True:
        response = table.scan(**scan_kwargs)
        for item in response.get("Items", []):
            token = item.get("subscription", "").strip()
            item_id = item.get("id", "")
            if token and item_id:
                token_to_id[token] = item_id  # 同じトークンが複数あれば最後の1件だけ残る

        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        scan_kwargs["ExclusiveStartKey"] = last_key

    return token_to_id  # {token: dynamodb_id}


def delete_invalid_token(dynamodb_id):
    """無効になった FCM トークンに対応する DynamoDB エントリを削除する"""
    try:
        table = dynamodb.Table(DYNAMODB_TABLE)
        table.delete_item(Key={"id": dynamodb_id})
        logger.info(f"無効トークンを DynamoDB から削除: id={dynamodb_id}")
    except Exception as e:
        logger.warning(f"無効トークン削除失敗（無視）: id={dynamodb_id}, error={e}")


def send_fcm_notification(device_token, title, body, access_token=None):
    import requests as req

    if access_token is None:
        access_token = get_access_token()
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "message": {
            "token": device_token,
            # Android Doze モードを貫通させるため high priority を設定
            "android": {
                "priority": "HIGH",
                "notification": {
                    "title": title,
                    "body": body,
                    "icon": "https://dev.d3nlv05moq0vc5.amplifyapp.com/icon-192.png",
                    # ロック画面でヘッドアップ通知として表示させる
                    "notification_priority": "PRIORITY_HIGH",
                },
            },
            "apns": {
                "headers": {"apns-priority": "10"},
                "payload": {
                    "aps": {
                        "alert": {"title": title, "body": body},
                        "sound": "default",
                    }
                },
            },
            "webpush": {
                # FCM が高優先度で即時デリバリーするよう指示
                "headers": {
                    "Urgency": "high",
                    "TTL": "86400",
                },
                # notification フィールドを追加することで、SW がサスペンド中でも
                # ブラウザの push インフラが直接通知を表示できるようにする
                # (スリープ時の通知を確実に届けるために必要)
                "notification": {
                    "title": title,
                    "body": body,
                    "icon": "https://dev.d3nlv05moq0vc5.amplifyapp.com/icon-192.png",
                },
                "data": {
                    "title": title,
                    "body": body,
                },
                "fcm_options": {
                    "link": "https://dev.d3nlv05moq0vc5.amplifyapp.com/",
                },
            },
        }
    }
    response = req.post(FCM_URL, headers=headers, json=payload, timeout=10)
    response.raise_for_status()
    return response.json()


def lambda_handler(event, context):
    logger.info(f"ジオフェンスイベント受信: {json.dumps(event, ensure_ascii=False)}")

    detail = event.get("detail", {})
    event_type = detail.get("EventType")

    if event_type != "ENTER":
        logger.info(f"ENTERイベント以外のためスキップ: {event_type}")
        return {"statusCode": 200, "body": "skipped"}

    device_id = detail.get("DeviceId", "unknown")

    # DynamoDB ロックで重複通知を防ぐ（5分間クールダウン）
    try:
        if not try_acquire_notification_lock(device_id):
            return {"statusCode": 200, "body": "rate limited (cooldown active)"}
    except Exception as e:
        logger.warning(f"通知ロック取得中にエラー（通知は継続）: {e}")

    # DynamoDB から全FCMトークンを取得
    try:
        tokens = get_all_fcm_tokens()
    except Exception as e:
        logger.error(f"DynamoDB からトークン取得失敗: {e}")
        return {"statusCode": 500, "body": f"failed to fetch tokens: {e}"}

    token_map = tokens  # get_all_fcm_tokens() が dict を返すように変更済み
    if not token_map:
        logger.warning("登録済みトークンが見つかりませんでした")
        return {"statusCode": 200, "body": "no tokens found"}

    logger.info(f"通知対象トークン数: {len(token_map)}")

    title = "🍠 どんなとき芋が近くにいるバイ！"
    body = "焼き芋屋さんが1km圏内に来たバイ！急いで外に出てみてね！"

    sent_count = 0
    error_count = 0

    # アクセストークンを一度だけ取得（並列実行中の競合を防ぐ）
    try:
        access_token = get_access_token()
    except Exception as e:
        logger.error(f"アクセストークン取得失敗: {e}")
        return {"statusCode": 500, "body": f"failed to get access token: {e}"}

    def send_one(item):
        device_token, db_id = item
        return send_fcm_notification(device_token=device_token, title=title, body=body, access_token=access_token), db_id

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(send_one, (t, db_id)): t for t, db_id in token_map.items()}
        for future in as_completed(futures):
            token = futures[future]
            try:
                result, db_id = future.result()
                logger.info(f"FCM送信成功 token={token[:20]}...: {result}")
                sent_count += 1
            except Exception as e:
                err_str = str(e)
                logger.error(f"FCM送信失敗 token={token[:20]}...: {err_str}")
                error_count += 1
                # 無効トークン（UNREGISTERED / NOT_FOUND）は DynamoDB から削除
                if "UNREGISTERED" in err_str or "NOT_FOUND" in err_str or "404" in err_str:
                    db_id = token_map.get(token)
                    if db_id:
                        delete_invalid_token(db_id)

    return {"statusCode": 200, "body": f"notifications sent: {sent_count}/{len(token_map)}, errors: {error_count}"}

