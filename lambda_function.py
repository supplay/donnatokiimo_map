import json
import logging
import os
import time
import boto3
from concurrent.futures import ThreadPoolExecutor, as_completed
from boto3.dynamodb.conditions import Key

import requests as req
from google.oauth2 import service_account
import google.auth.transport.requests

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ssm_client = boto3.client("ssm")

DYNAMODB_TABLE = os.environ.get(
    "DYNAMODB_TABLE",
    "UserSubscription-am4o5w4fdfbiflmztjnv4saobi-dev",
)
USER_TOKENS_TABLE = os.environ.get("USER_TOKENS_TABLE", "UserTokens")

dynamodb = boto3.resource("dynamodb", region_name="ap-northeast-1")

FCM_URL = "https://fcm.googleapis.com/v1/projects/donnatokiimo-6e7be/messages:send"
FCM_SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]
PARAM_NAME = os.environ.get("PARAM_NAME", "/donnatokiimo/firebase-service-account")

NOTIFICATION_COOLDOWN_SECONDS = 120  # 2分間は同一デバイスの重複通知を防ぐ


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

    if _credentials is None:
        response = ssm_client.get_parameter(Name=PARAM_NAME, WithDecryption=True)
        sa_info = json.loads(response["Parameter"]["Value"])
        _credentials = service_account.Credentials.from_service_account_info(
            sa_info, scopes=FCM_SCOPES
        )

    if not _credentials.valid:
        _credentials.refresh(google.auth.transport.requests.Request())

    return _credentials.token


def get_tokens_by_geofence_id(geofence_id):
    """UserTokensテーブルからgeofence_idに対応するFCMトークンを取得する"""
    table = dynamodb.Table(USER_TOKENS_TABLE)
    # {device_token: (geofence_id, device_token)} のマッピング（削除用キー付き）
    token_map = {}
    try:
        response = table.query(
            KeyConditionExpression=Key("geofence_id").eq(geofence_id)
        )
        for item in response.get("Items", []):
            device_token = item.get("device_token", "").strip()
            if device_token:
                token_map[device_token] = (geofence_id, device_token)
    except Exception as e:
        logger.error(f"UserTokensテーブルクエリ失敗: geofence_id={geofence_id}, error={e}")
    return token_map  # {token: (geofence_id, device_token)}


def delete_invalid_token(geofence_id, device_token):
    """無効になった FCM トークンに対応する DynamoDB エントリを削除する"""
    try:
        table = dynamodb.Table(USER_TOKENS_TABLE)
        table.delete_item(Key={"geofence_id": geofence_id, "device_token": device_token})
        logger.info(f"無効トークンを DynamoDB から削除: geofence_id={geofence_id}")
    except Exception as e:
        logger.warning(f"無効トークン削除失敗（無視）: geofence_id={geofence_id}, error={e}")


def send_fcm_notification(device_token, title, body, access_token=None):
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


CORS_ALLOW_ORIGIN = "https://dev.d3nlv05moq0vc5.amplifyapp.com"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": CORS_ALLOW_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def lambda_handler(event, context):
    # Function URL (HTTP) からの直接呼び出し判定
    is_http = "requestContext" in event or "rawPath" in event

    if is_http:
        method = event.get("requestContext", {}).get("http", {}).get("method", "")
        if method == "OPTIONS":
            return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "invalid JSON"})}

        single_token = body.get("single_token", "").strip()
        if not single_token:
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "single_token is required"})}

        logger.info(f"シングルトークンモード（直接HTTP呼び出し）: token={single_token[:20]}...")
        title = "🍠 どんなとき芋が近くにいるバイ！"
        body_text = "焼き芋屋さんが1km圏内に来たバイ！急いで外に出てみてね！"
        try:
            access_token = get_access_token()
            result = send_fcm_notification(single_token, title, body_text, access_token)
            logger.info(f"シングルトークン送信成功: {result}")
            return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps({"ok": True, "result": result})}
        except Exception as e:
            logger.error(f"シングルトークン送信失敗: {e}")
            return {"statusCode": 500, "headers": CORS_HEADERS, "body": json.dumps({"ok": False, "error": str(e)})}

    # ---- 以下は EventBridge 経由の通常フロー ----
    logger.info(f"ジオフェンスイベント受信: {json.dumps(event, ensure_ascii=False)}")

    detail = event.get("detail", {})
    event_type = detail.get("EventType")

    if event_type != "ENTER":
        logger.info(f"ENTERイベント以外のためスキップ: {event_type}")
        return {"statusCode": 200, "body": "skipped"}

    device_id = detail.get("DeviceId", "unknown")
    geofence_id = detail.get("GeofenceId", "")

    # DynamoDB ロックで重複通知を防ぐ（ユーザーごとに2分クールダウン）
    # ロックキーは geofence_id（ユーザーごと）にすることで、
    # 複数ユーザーが同時にジオフェンスに入ってもそれぞれ通知が届く
    lock_key = geofence_id if geofence_id else device_id
    try:
        if not try_acquire_notification_lock(lock_key):
            return {"statusCode": 200, "body": "rate limited (cooldown active)"}
    except Exception as e:
        logger.warning(f"通知ロック取得中にエラー（通知は継続）: {e}")
    try:
        token_map = get_tokens_by_geofence_id(geofence_id)
    except Exception as e:
        logger.error(f"DynamoDB からトークン取得失敗: {e}")
        return {"statusCode": 500, "body": f"failed to fetch tokens: {e}"}

    if not token_map:
        logger.warning(f"登録済みトークンが見つかりませんでした: geofence_id={geofence_id}")
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
        device_token, key_tuple = item
        return send_fcm_notification(device_token=device_token, title=title, body=body, access_token=access_token), key_tuple

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(send_one, (t, key)): t for t, key in token_map.items()}
        for future in as_completed(futures):
            token = futures[future]
            try:
                result, key_tuple = future.result()
                logger.info(f"FCM送信成功 token={token[:20]}...: {result}")
                sent_count += 1
            except Exception as e:
                err_str = str(e)
                logger.error(f"FCM送信失敗 token={token[:20]}...: {err_str}")
                error_count += 1
                # 無効トークン（UNREGISTERED / NOT_FOUND）は DynamoDB から削除
                if "UNREGISTERED" in err_str or "NOT_FOUND" in err_str or "404" in err_str:
                    key_tuple = token_map.get(token)
                    if key_tuple:
                        delete_invalid_token(*key_tuple)

    return {"statusCode": 200, "body": f"notifications sent: {sent_count}/{len(token_map)}, errors: {error_count}"}

