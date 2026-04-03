import json
import logging
import os
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
    """DynamoDB から全 UserSubscription の FCM トークンを取得する"""
    table = dynamodb.Table(DYNAMODB_TABLE)
    tokens = []
    scan_kwargs = {
        "ProjectionExpression": "#sub",
        "ExpressionAttributeNames": {"#sub": "subscription"},
    }

    while True:
        response = table.scan(**scan_kwargs)
        for item in response.get("Items", []):
            token = item.get("subscription", "").strip()
            if token:
                tokens.append(token)

        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        scan_kwargs["ExclusiveStartKey"] = last_key

    return tokens


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
            "webpush": {
                "notification": {
                    "title": title,
                    "body": body,
                    "icon": "https://dev.d3nlv05moq0vc5.amplifyapp.com/icon-192.png",
                    "badge": "https://dev.d3nlv05moq0vc5.amplifyapp.com/icon-192.png",
                    "vibrate": [200, 100, 200],
                    "requireInteraction": False,
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

    # AppSync から全FCMトークンを取得
    try:
        tokens = get_all_fcm_tokens()
    except Exception as e:
        logger.error(f"AppSync からトークン取得失敗: {e}")
        return {"statusCode": 500, "body": f"failed to fetch tokens: {e}"}

    if not tokens:
        logger.warning("登録済みトークンが見つかりませんでした")
        return {"statusCode": 200, "body": "no tokens found"}

    logger.info(f"通知対象トークン数: {len(tokens)}")

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

    def send_one(device_token):
        return send_fcm_notification(device_token=device_token, title=title, body=body, access_token=access_token)

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(send_one, t): t for t in tokens}
        for future in as_completed(futures):
            token = futures[future]
            try:
                result = future.result()
                logger.info(f"FCM送信成功 token={token[:20]}...: {result}")
            except Exception as e:
                logger.error(f"FCM送信失敗 token={token[:20]}...: {e}")

    sent_count = sum(1 for f in futures if not f.exception())
    error_count = len(futures) - sent_count

    return {"statusCode": 200, "body": f"notifications sent: {sent_count}/{len(tokens)}, errors: {error_count}"}

