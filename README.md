# aws-github-webhook
A CustomResource for AWS that manages a webhook on a GitHub repository.

## Requirements
* [Node.js 14+](https://nodejs.org/)
* [aws-cdk CLI](https://docs.aws.amazon.com/cdk/latest/guide/cli.html)
* [yarn](https://yarnpkg.com/)

## Deployment

### Pipeline
```
cdk deploy github-webhook-pipeline -c slackNotifyStackName=[stackName]
```

### Service Stack

For simplest deployment without overriding any default parameters, run:
```
cdk deploy github-webhook-custom-resource-dev
```

This will deploy to the `dev` stack. Pass `-c stage=[stageName]` if you want to deploy a different instance.

## Usage

To utilize this lambda, import `<stackName>:LambdaArn` and create a provider in another stack. Populate the required properties accordingly:
* Repo - Path to the repository on Github. Looks like `owner/myRepoName`
* Events - Which events should trigger the webhook. Usually `push`
* Endpoint - Url endpoint the webhook should send payloads to.

The following is an example of doing this with cdk:

```typescript
import { LambdaRestApi } from '@aws-cdk/aws-apigateway'
import { Function } from '@aws-cdk/aws-lambda'
import { RetentionDays } from '@aws-cdk/aws-logs'
import { Provider } from '@aws-cdk/custom-resources'
import * as cdk from '@aws-cdk/core'

const api = new LambdaRestApi(this, 'SomeApi', { ... })
const webhookLambdaArn = cdk.Fn.importValue('github-webhook-custom-resource-dev:LambdaArn')
const webhookLambda = Function.fromFunctionArn(this, 'WebhookLambda', webhookLambdaArn)
const resourceProvider = new Provider(this, 'WebhookProvider', {
  onEventHandler: webhookLambda,
  logRetention: RetentionDays.ONE_WEEK,
})
new cdk.CustomResource(this, 'GithubWebhook', {
  resourceType: 'Custom::GitHubWebhook',
  serviceToken: resourceProvider.serviceToken,
  properties: {
    Repo: 'owner/myRepoName',
    Events: 'push',
    Endpoint: api.url,
  },
})
```
