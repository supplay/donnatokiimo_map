from aws_cdk import (
    Stack,
    RemovalPolicy,
    Duration,
    CfnOutput
)
from constructs import Construct
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_lambda as _lambda
from aws_cdk import aws_iam as iam
import os

# AppSync alpha module for Python CDK is not always available; if not, use Cfn resources or CDK L2 if available
try:
    from aws_cdk import aws_appsync_alpha as appsync
except ImportError:
    appsync = None

class BackendStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. DynamoDBテーブルの作成
        table = dynamodb.Table(
            self, "YakiimoTable",
            partition_key=dynamodb.Attribute(name="pk", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="sk", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY
        )

        # 2. AppSync APIの作成
        if appsync:
            api = appsync.GraphqlApi(
                self, "YakiimoApi",
                name="yakiimo-now-api",
                schema=appsync.SchemaFile.from_asset(os.path.join(os.path.dirname(__file__), '../schema.graphql')),
                authorization_config=appsync.AuthorizationConfig(
                    default_authorization=appsync.AuthorizationMode(
                        authorization_type=appsync.AuthorizationType.API_KEY
                    )
                )
            )

            # 3. DynamoDBデータソースの追加
            data_source = api.add_dynamo_db_data_source("YakiimoDataSource", table)

            # 4. Mutation.createArea のリゾバー設定
            data_source.create_resolver(
                "createAreaResolver",
                type_name="Mutation",
                field_name="createArea",
                request_mapping_template=appsync.MappingTemplate.from_string('''
                {
                  "version": "2018-05-29",
                  "operation": "PutItem",
                  "key": {
                    "pk": $util.dynamodb.toDynamoDBJson("AREA"),
                    "sk": $util.dynamodb.toDynamoDBJson($ctx.args.id)
                  },
                  "attributeValues": $util.dynamodb.toMapValuesJson($ctx.args)
                }
                '''),
                response_mapping_template=appsync.MappingTemplate.dynamo_db_result_item()
            )

        # 5. Python版 AI生成用Lambda
        ai_lambda = _lambda.Function(
            self, "AiGeneratorLambda",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="ai_generator.handler",
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), '../lambda')),
            timeout=Duration.seconds(30)
        )

        # 6. LambdaにBedrock（Claude 3 Haiku）の実行権限を付与
        ai_lambda.add_to_role_policy(iam.PolicyStatement(
            actions=["bedrock:InvokeModel"],
            resources=["arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"]
        ))

        if appsync:
            # 7. AppSyncのデータソースとしてLambdaを登録
            lambda_ds = api.add_lambda_data_source("AiLambdaDataSource", ai_lambda)

            # 8. Area.catchCopy フィールドにLambdaリゾバーを紐付け
            lambda_ds.create_resolver(
                "CatchCopyResolver",
                type_name="Area",
                field_name="catchCopy"
            )

            # 出力（確認用）
            CfnOutput(self, "GraphQLAPIURL", value=api.graphql_url)
            CfnOutput(self, "GraphQLAPIKey", value=api.api_key or "")