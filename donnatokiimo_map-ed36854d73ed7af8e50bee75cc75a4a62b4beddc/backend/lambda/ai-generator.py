import json
import boto3

def handler(event, context):
    # AppSyncからの入力を取得
    name = event.get('source', {}).get('name', 'いつもの場所')
    
    bedrock = boto3.client(service_name='bedrock-runtime', region_name='us-east-1')
    
    prompt = f"Human: あなたは焼き芋屋の店主です。「{name}」で営業しています。短く魅力的なキャッチコピーを1文だけ考えてください。余計な解説は不要です。\nAssistant:"
    
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 100,
        "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}],
        "temperature": 0.7
    })

    try:
        response = bedrock.invoke_model(modelId='anthropic.claude-3-haiku-20240307-v1:0', body=body)
        response_body = json.loads(response.get('body').read())
        return response_body['content'][0]['text'].strip()
    except Exception as e:
        print(f"Error: {e}")
        return "ホクホクの甘い焼き芋、いかがですか！"
    