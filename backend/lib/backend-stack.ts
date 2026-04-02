import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as path from "path";

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. DynamoDBテーブルの作成
    const table = new dynamodb.Table(this, "YakiimoTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 2. Python版 AI生成用Lambda
    const aiLambda = new lambda.Function(this, "AiGeneratorLambda", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "ai_generator.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambda")),
      timeout: cdk.Duration.seconds(30),
    });

    // 3. LambdaにBedrock（Claude 3 Haiku）の実行権限を付与
    aiLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [
          "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
        ],
      })
    );

    // 4. ジオフェンス通知用Lambda（ルートの lambda_function.py）
    const notificationLambda = new lambda.Function(
      this,
      "NotificationLambda",
      {
        runtime: lambda.Runtime.PYTHON_3_12,
        handler: "lambda_function.lambda_handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../../"), {
          exclude: [
            "node_modules",
            ".git",
            "amplify",
            "amplify-backup",
            "frontend",
            "src",
            "public",
            "admin",
            "backend",
            "backend-py",
            "python",
            "docs",
            "_archive",
            "donnatokiimo_map",
            "donnatokiimo_map-*",
            "*.zip",
            "*.json",
            "*.md",
            "*.yml",
            "*.yaml",
            "*.js",
            "*.ts",
            "*.css",
            "*.html",
          ],
        }),
        timeout: cdk.Duration.seconds(60),
        memorySize: 512,
        environment: {
          APPSYNC_ENDPOINT:
            "https://fliomdzyc5erhbr35jafl6o4q4.appsync-api.ap-northeast-1.amazonaws.com/graphql",
          APPSYNC_API_KEY: "da2-g7dzoznkhjfzzhk46z6xgz4sfy",
        },
      }
    );

    // 5. Secrets Manager権限（Firebaseサービスアカウント取得）
    notificationLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [
          "arn:aws:secretsmanager:ap-northeast-1:*:secret:firebase-service-account*",
        ],
      })
    );

    // 6. EventBridgeルール: Location Serviceジオフェンスイベント(ENTER) → 通知Lambda
    const geofenceRule = new events.Rule(this, "GeofenceEnterRule", {
      eventPattern: {
        source: ["aws.geo"],
        detailType: ["Location Geofence Event"],
        detail: {
          EventType: ["ENTER"],
        },
      },
    });
    geofenceRule.addTarget(new targets.LambdaFunction(notificationLambda));

    // 出力
    new cdk.CfnOutput(this, "NotificationLambdaName", {
      value: notificationLambda.functionName,
    });
    new cdk.CfnOutput(this, "AiGeneratorLambdaName", {
      value: aiLambda.functionName,
    });

    // DynamoDBテーブル名も出力（参照用）
    new cdk.CfnOutput(this, "YakiimoTableName", { value: table.tableName });
  }
}
