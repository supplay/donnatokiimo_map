import { Authenticator, useTheme, View, Heading, Text } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

export default function AdminSignup() {
  const { tokens } = useTheme();
  return (
    <View
      backgroundColor={tokens.colors.background.secondary}
      padding={tokens.space.large}
      maxWidth={400}
      margin="auto"
      marginTop={tokens.space.xl}
      borderRadius={tokens.radii.large}
      boxShadow={tokens.shadows.medium}
    >
      <Heading level={3} marginBottom={tokens.space.medium}>
        管理者アカウント作成
      </Heading>
      <Text marginBottom={tokens.space.medium}>
        管理者用の新規アカウントを作成してください。
      </Text>
      <Authenticator signUpAttributes={["email"]} />
    </View>
  );
}
