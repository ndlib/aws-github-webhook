import { Construct } from 'constructs'
import { join } from 'path'
import { CfnOutput, Duration, SecretValue, Stack, StackProps } from 'aws-cdk-lib'
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda'

export interface GitHubWebhookResourceProps extends StackProps {
  readonly gitSecretPath: string
}

export class GitHubWebhookResourceStack extends Stack {
  constructor(scope: Construct, id: string, props: GitHubWebhookResourceProps) {
    super(scope, id, props)

    const lambda = new Function(this, 'WebhookEventLambda', {
      description: 'Custom::GitHubWebhook',
      code: Code.fromAsset(join(__dirname, '../src/webhookEventLambda')),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_14_X,
      timeout: Duration.minutes(1),
      environment: {
        GITHUB_TOKEN: SecretValue.secretsManager(props.gitSecretPath, { jsonField: 'oauth' }).toString(),
        WEBHOOK_SECRET: SecretValue.secretsManager(props.gitSecretPath, { jsonField: 'webhook-secret' }).toString(),
      },
    })

    new CfnOutput(this, 'LambdaArnOutput', {
      value: lambda.functionArn,
      description: '',
      exportName: `${this.stackName}:LambdaArn`,
    })
  }
}
