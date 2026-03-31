import json
import logging
import boto3
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
secrets_client = boto3.client("secretsmanager")

TABLE_NAME = "UserTokens"
SECRET_NAME = "firebase-service-account"
FCM_URL = "https://fcm.googleapis.com/v1/projects/donnatokiimo-6e7be/messages:send"
FCM_SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]

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


def send_fcm_notification(device_token, title, body):
    import requests as req

    access_token = get_access_token()
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "message": {
            "token": device_token,
            "notification": {"title": title, "body": body},
            "webpush": {
                "notification": {
                    "title": title,
                    "body": body,
                    "icon": "/favicon.ico",
                    "badge": "/favicon.ico",
                    "vibrate": [200, 100, 200],
                }
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
    geofence_id = detail.get("GeofenceId", "")

    if event_type != "ENTER":
        logger.info(f"ENTERイベント以外のためスキップ: {event_type}")
        return {"statusCode": 200, "body": "skipped"}

    logger.info(f"ジオフェンスID: {geofence_id}")

    # UserTokens テーブルから FCMトークンを取得（geofence_id で query）
    table = dynamodb.Table(TABLE_NAME)
    response = table.query(
        KeyConditionExpression=Key("geofence_id").eq(geofence_id)
    )
    items = response.get("Items", [])

    if not items:
        logger.warning(f"トークンが見つかりませんでした: geofence_id={geofence_id}")
        return {"statusCode": 200, "body": "no token found"}

    title = "🍠 どんなとき芋が近くにいるバイ！"
    body = "焼き芋屋さんが1km圏内に来たバイ！急いで外に出てみてね！"

    sent_count = 0
    for item in items:
        device_token = item["device_token"]
        try:
            result = send_fcm_notification(device_token=device_token, title=title, body=body)
            logger.info(f"FCM送信成功 [{sent_count+1}/{len(items)}]: {result}")
            sent_count += 1
        except Exception as e:
            logger.error(f"FCM送信失敗 token={device_token[:20]}...: {e}")

    return {"statusCode": 200, "body": f"notifications sent: {sent_count}/{len(items)}"}

