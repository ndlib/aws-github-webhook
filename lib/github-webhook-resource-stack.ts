import * as path from 'path'
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda'
import * as cdk from '@aws-cdk/core'

export interface GitHubWebhookResourceProps extends cdk.StackProps {
  readonly gitSecretPath: string
}

export class GitHubWebhookResourceStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: GitHubWebhookResourceProps) {
    super(scope, id, props)

    const lambda = new Function(this, 'WebhookEventLambda', {
      description: 'Custom::GitHubWebhook',
      code: Code.fromAsset(path.join(__dirname, '../src/webhookEventLambda')),
      handler: 'index.handler',
      runtime: Runtime.NODEJS_14_X,
      timeout: cdk.Duration.minutes(1),
      environment: {
        GITHUB_TOKEN: cdk.SecretValue.secretsManager(props.gitSecretPath, { jsonField: 'oauth' }).toString(),
        WEBHOOK_SECRET: cdk.SecretValue.secretsManager(props.gitSecretPath, { jsonField: 'webhook-secret' }).toString(),
      },
    })

    new cdk.CfnOutput(this, 'LambdaArnOutput', {
      value: lambda.functionArn,
      description: '',
      exportName: `${this.stackName}:LambdaArn`,
    })
  }
}
