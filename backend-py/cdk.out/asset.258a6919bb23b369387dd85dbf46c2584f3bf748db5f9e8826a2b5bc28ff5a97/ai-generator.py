import json
import boto3
import os

def handler(event, context):
    # AppSyncから渡されるエリア情報を取得
    # 引数が event['source'] に入ってくる想定です
    area_name = event.get('source', {}).get('name', 'どこかの街')
    
    bedrock = boto3.client(service_name='bedrock-runtime', region_name='us-east-1')

    # AIへの指示（プロンプト）
    prompt = f"あなたは焼き芋販売のプロです。{area_name}で売っている、最高に甘くてホクホクな焼き芋のキャッチコピーを1つ、20文字以内で考えて。"

    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 100,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    })

    try:
        response = bedrock.invoke_model(
            modelId='anthropic.claude-3-haiku-20240307-v1:0',
            body=body
        )
        
        response_body = json.loads(response.get('body').read())
        catch_copy = response_body['content'][0]['text'].strip()
        
        return catch_copy

    except Exception as e:
        print(e)
        return "最高に美味しい焼き芋、あります。"