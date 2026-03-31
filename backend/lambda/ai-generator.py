import json
import boto3

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Content-Type": "application/json",
}

def handler(event, context):
    # CORS preflight
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        body = {}

    weather = body.get("weather", "晴れ")
    temp = body.get("temp", "20")

    bedrock = boto3.client(service_name="bedrock-runtime", region_name="us-east-1")

    prompt = (
        f"あなたは九州弁の焼き芋屋の気さくなおじさんです。"
        f"今日の天気は「{weather}」、最高気温は{temp}℃です。"
        f"この天気と気温を活かした、お客さんに話しかけるような短い一言セリフを1文だけ作ってください。"
        f"「バイ」「じゃ」「けんね」など九州弁を自然に混ぜてください。"
        f"50文字以内で、余計な説明や改行は不要です。セリフだけ返してください。"
    )

    body_json = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 120,
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
        "temperature": 0.9,
    })

    try:
        response = bedrock.invoke_model(
            modelId="anthropic.claude-3-haiku-20240307-v1:0",
            body=body_json,
        )
        result = json.loads(response["body"].read())
        message = result["content"][0]["text"].strip()
    except Exception as e:
        print(f"Bedrock error: {e}")
        message = "ほっこり焼けちょるバイ！食べていきんしゃい！"

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({"message": message}, ensure_ascii=False),
    }
    