from aws_cdk import (
    Stack,
    RemovalPolicy,
    Duration,
    CfnOutput,
    aws_dynamodb as dynamodb,
    aws_appsync as appsync,
    aws_lambda as _lambda,
    aws_iam as iam,
)
from constructs import Construct
import os

class BackendPyStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. DynamoDB: 芋の位置情報を保存
        table = dynamodb.Table(self, "YakiimoTable",
            partition_key=dynamodb.Attribute(name="pk", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="sk", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        # 2. AppSync API: 通信の窓口
        api = appsync.GraphqlApi(self, "YakiimoApi",
            name="yakiimo-now-api-py",
            definition=appsync.Definition.from_file("./schema.graphql"),
            authorization_config=appsync.AuthorizationConfig(
                default_authorization=appsync.AuthorizationMode(
                    authorization_type=appsync.AuthorizationType.API_KEY
                )
            )
        )

        # 3. DynamoDB用のリゾバー (エリア登録)
        ds = api.add_dynamo_db_data_source("YakiimoDataSource", table)
        ds.create_resolver("createAreaResolver",
            type_name="Mutation",
            field_name="createArea",
            request_mapping_template=appsync.MappingTemplate.from_string("""
                {
                    "version": "2018-05-29",
                    "operation": "PutItem",
                    "key": {
                        "pk": $util.dynamodb.toDynamoDBJson("AREA"),
                        "sk": $util.dynamodb.toDynamoDBJson($ctx.args.id)
                    },
                    "attributeValues": $util.dynamodb.toMapValuesJson($ctx.args)
                }
            """),
            response_mapping_template=appsync.MappingTemplate.dynamo_db_result_item()
        )

        # 4. AI生成用 Lambda (Python)
        ai_lambda = _lambda.Function(self, "AiGeneratorLambda",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="ai_generator.handler",
            code=_lambda.Code.from_asset("lambda"),
            timeout=Duration.seconds(30)
        )

        # 5. Bedrockへの権限許可
        ai_lambda.add_to_role_policy(iam.PolicyStatement(
            actions=["bedrock:InvokeModel"],
            resources=["arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"]
        ))

        # 6. Lambdaリゾバー (キャッチコピー生成)
        lambda_ds = api.add_lambda_data_source("AiLambdaDataSource", ai_lambda)
        lambda_ds.create_resolver("CatchCopyResolver",
            type_name="Area",
            field_name="catchCopy"
        )

        # 7. 接続情報の出力（これで見えるようになります！）
        CfnOutput(self, "GraphQLAPIURL", value=api.graphql_url)
        CfnOutput(self, "GraphQLAPIKey", value=api.api_key or "")