import { App, SecretValue, Stack, StackProps } from 'aws-cdk-lib'
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline'
import { CodeBuildAction, GitHubSourceAction, GitHubTrigger, ManualApprovalAction } from 'aws-cdk-lib/aws-codepipeline-actions'
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { ArtifactBucket, PipelineNotifications, SlackApproval } from '@ndlib/ndlib-cdk2'
import GitHubWebhookBuildProject from './github-webhook-build-project'
import GitHubWebhookBuildRole from './github-webhook-build-role'

const stages = ['test', 'prod']

export interface IGitHubWebhookPipelineStackProps extends StackProps {
  readonly contact: string
  readonly owner: string
  readonly stackNamePrefix: string
  readonly gitSecretPath: string
  readonly infraRepoOwner: string
  readonly infraRepoName: string
  readonly infraSourceBranch: string
  readonly slackNotifyStackName?: string
  readonly notificationReceivers?: string
}

export class GitHubWebhookPipelineStack extends Stack {
  constructor(scope: App, id: string, props: IGitHubWebhookPipelineStackProps) {
    super(scope, id, props)

    // S3 BUCKET FOR STORING ARTIFACTS
    const artifactBucket = new ArtifactBucket(this, 'ArtifactBucket', {})

    // IAM ROLES
    const codepipelineRole = new Role(this, 'CodePipelineRole', {
      assumedBy: new ServicePrincipal('amazonaws.com'),
    })
    const codebuildRole = new GitHubWebhookBuildRole(this, 'CodeBuildTrustRole', {
      assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
      stackNamePrefix: props.stackNamePrefix,
      gitSecretPath: props.gitSecretPath,
      stages,
      artifactBucket,
    })

    // CREATE PIPELINE
    const pipeline = new Pipeline(this, 'CodePipeline', {
      artifactBucket,
      role: codepipelineRole,
    })
    if (props.notificationReceivers) {
      new PipelineNotifications(this, 'PipelineNotifications', {
        pipeline,
        receivers: props.notificationReceivers,
      })
    }

    // SOURCE BLUEPRINTS
    const infraSourceArtifact = new Artifact('InfraCode')
    const infraSourceAction = new GitHubSourceAction({
      actionName: 'SourceInfraCode',
      owner: props.infraRepoOwner,
      repo: props.infraRepoName,
      branch: props.infraSourceBranch,
      oauthToken: SecretValue.secretsManager(props.gitSecretPath, { jsonField: 'oauth' }),
      output: infraSourceArtifact,
      trigger: GitHubTrigger.WEBHOOK,
    })
    pipeline.addStage({
      stageName: 'Source',
      actions: [infraSourceAction],
    })

    // DEPLOY TO TEST
    const deployToTestProject = new GitHubWebhookBuildProject(this, 'GitHubWebhookTestBuildProject', {
      ...props,
      stage: 'test',
      role: codebuildRole,
    })
    const deployToTestAction = new CodeBuildAction({
      actionName: 'Build',
      project: deployToTestProject,
      input: infraSourceArtifact,
      runOrder: 1,
      outputs: [],
    })

    // APPROVAL
    const approvalTopic = new Topic(this, 'PipelineApprovalTopic', {
      displayName: 'PipelineApprovalTopic',
    })
    const manualApprovalAction = new ManualApprovalAction({
      actionName: 'ManualApprovalOfTestEnvironment',
      notificationTopic: approvalTopic,
      additionalInformation: 'Approve or Reject this change after testing',
      runOrder: 99, // Approval should always be last
    })
    if (props.slackNotifyStackName) {
      new SlackApproval(this, 'SlackApproval', {
        approvalTopic,
        notifyStackName: props.slackNotifyStackName,
      })
    }

    // TEST STAGE
    pipeline.addStage({
      stageName: 'DeployToTest',
      actions: [deployToTestAction, manualApprovalAction],
    })

    // DEPLOY TO PROD
    const deployToProdProject = new GitHubWebhookBuildProject(this, 'GitHubWebhookProdBuildProject', {
      ...props,
      stage: 'prod',
      role: codebuildRole,
    })
    const deployToProdAction = new CodeBuildAction({
      actionName: 'Build',
      project: deployToProdProject,
      input: infraSourceArtifact,
      runOrder: 1,
      outputs: [],
    })

    // PROD STAGE
    pipeline.addStage({
      stageName: 'DeployToProd',
      actions: [deployToProdAction],
    })
  }
}

export default GitHubWebhookPipelineStack
