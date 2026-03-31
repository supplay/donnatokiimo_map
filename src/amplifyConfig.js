import awsExports from "./aws-exports";

// Identity Pool はアプリで使用していないため除外
// （Amplify v6 がゲスト認証を自動試行して 400 エラーになるのを防ぐ）
const { aws_cognito_identity_pool_id: _removed, ...config } = awsExports;

export default config;