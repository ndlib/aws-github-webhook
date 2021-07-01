#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { StackTags } from '@ndlib/ndlib-cdk'
import { GitHubWebhookResourceStack } from '../lib/github-webhook-resource-stack'
import { GitHubWebhookPipelineStack } from '../lib/github-webhook-pipeline-stack'

const app = new cdk.App()
cdk.Aspects.of(app).add(new StackTags())

const stackPrefix = app.node.tryGetContext('stackNamePrefix') || 'github-webhook-custom-resource'
const gitSecretPath = app.node.tryGetContext('gitSecretPath')

const stage = app.node.tryGetContext('stage')
const serviceStackName = stackPrefix + (stage ? `-${stage}` : '')
new GitHubWebhookResourceStack(app, serviceStackName, {
  stackName: serviceStackName,
  gitSecretPath,
})

const pipelineName = app.node.tryGetContext('pipelineStackName') || 'github-webhook-pipeline'
new GitHubWebhookPipelineStack(app, pipelineName, {
  stackName: pipelineName,
  contact: app.node.tryGetContext('contact'),
  owner: app.node.tryGetContext('owner'),
  stackNamePrefix: stackPrefix,
  gitSecretPath,
  infraRepoOwner: app.node.tryGetContext('infraRepoOwner'),
  infraRepoName: app.node.tryGetContext('infraRepoName'),
  infraSourceBranch: app.node.tryGetContext('infraSourceBranch'),
  slackNotifyStackName: app.node.tryGetContext('slackNotifyStackName'),
  notificationReceivers: app.node.tryGetContext('notificationReceivers'),
})
