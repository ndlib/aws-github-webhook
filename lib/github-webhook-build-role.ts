import { Construct } from 'constructs'
import { Fn } from 'aws-cdk-lib'
import { PolicyStatement, Role, RoleProps } from 'aws-cdk-lib/aws-iam'
import { Bucket } from 'aws-cdk-lib/aws-s3'

export interface IGitHubWebhookBuildRoleProps extends RoleProps {
  readonly stackNamePrefix: string
  readonly stages: string[]
  readonly artifactBucket: Bucket
  readonly gitSecretPath: string
}

export class GitHubWebhookBuildRole extends Role {
  constructor(scope: Construct, id: string, props: IGitHubWebhookBuildRoleProps) {
    super(scope, id, props)

    const serviceStacks = props.stages.map(stage => `${props.stackNamePrefix}-${stage}`)
    // Some resources with generated names will truncate the end
    const shortNames = serviceStacks.map(stackName => stackName.slice(0, 25))

    // Allow checking what policies are attached to this role
    this.addToPolicy(
      new PolicyStatement({
        resources: [this.roleArn],
        actions: ['iam:GetRolePolicy'],
      }),
    )
    // Allow modifying IAM roles related to our application
    this.addToPolicy(
      new PolicyStatement({
        resources: shortNames.map(stackName => Fn.sub('arn:aws:iam::${AWS::AccountId}:role/' + stackName + '*')),
        actions: [
          'iam:GetRole',
          'iam:GetRolePolicy',
          'iam:CreateRole',
          'iam:DeleteRole',
          'iam:DeleteRolePolicy',
          'iam:AttachRolePolicy',
          'iam:DetachRolePolicy',
          'iam:PutRolePolicy',
          'iam:PassRole',
          'iam:TagRole',
        ],
      }),
    )

    // Allow logging for this stack
    this.addToPolicy(
      new PolicyStatement({
        resources: [
          Fn.sub('arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/codebuild/${AWS::StackName}-*'),
        ],
        actions: ['logs:CreateLogStream'],
      }),
    )
    this.addToPolicy(
      new PolicyStatement({
        resources: [
          Fn.sub(
            'arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/codebuild/${AWS::StackName}-*:log-stream:*',
          ),
        ],
        actions: ['logs:PutLogEvents'],
      }),
    )

    // Allow storing artifacts in S3 buckets
    this.addToPolicy(
      new PolicyStatement({
        resources: [props.artifactBucket.bucketArn, 'arn:aws:s3:::cdktoolkit-stagingbucket-*', 'arn:aws:s3:::cdk-*'],
        actions: ['s3:ListBucket', 's3:ListBucketVersions', 's3:GetBucketLocation', 's3:GetBucketPolicy'],
      }),
    )
    this.addToPolicy(
      new PolicyStatement({
        resources: [props.artifactBucket.bucketArn + '/*', 'arn:aws:s3:::cdktoolkit-stagingbucket-*/*', 'arn:aws:s3:::cdk-*/*'],
        actions: ['s3:GetObject', 's3:PutObject'],
      }),
    )

    // Allow creating and managing lambda with this stack name
    this.addToPolicy(
      new PolicyStatement({
        resources: shortNames.map(stackName =>
          Fn.sub('arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:' + stackName + '*'),
        ),
        actions: ['lambda:*'],
      }),
    )

    // Allow fetching details about and updating the application stack
    this.addToPolicy(
      new PolicyStatement({
        resources: serviceStacks.map(stackName =>
          Fn.sub('arn:aws:cloudformation:${AWS::Region}:${AWS::AccountId}:stack/' + stackName + '/*'),
        ),
        actions: [
          'cloudformation:DescribeStacks',
          'cloudformation:DescribeStackEvents',
          'cloudformation:DescribeChangeSet',
          'cloudformation:CreateChangeSet',
          'cloudformation:ExecuteChangeSet',
          'cloudformation:DeleteChangeSet',
          'cloudformation:DeleteStack',
          'cloudformation:GetTemplate',
        ],
      }),
    )

    // Allow reading some details about CDKToolkit stack so we can use the CDK CLI successfully from CodeBuild.
    this.addToPolicy(
      new PolicyStatement({
        resources: [Fn.sub('arn:aws:cloudformation:${AWS::Region}:${AWS::AccountId}:stack/CDKToolkit/*')],
        actions: ['cloudformation:DescribeStacks'],
      }),
    )

    // Add permission for CDK 2 deployments
    this.addToPolicy(new PolicyStatement({
      actions: [
        'sts:AssumeRole',
        'iam:PassRole',
      ],
      resources: [
        'arn:aws:iam::*:role/cdk-readOnlyRole',
        'arn:aws:iam::*:role/cdk-hnb659fds-deploy-role-*',
        'arn:aws:iam::*:role/cdk-hnb659fds-file-publishing-*',
        'arn:aws:iam::*:role/cdk-hnb659fds-image-publishing-*',
      ],
    }))

    // Allow getting needed secrets from SecretsManager
    this.addToPolicy(
      new PolicyStatement({
        resources: [
          Fn.sub('arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:' + props.gitSecretPath + '-*'),
        ],
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret',
          'secretsmanager:ListSecretVersionIds',
        ],
      }),
    )

    // Allow getting SSM parameters
    this.addToPolicy(
      new PolicyStatement({
        resources: [
          Fn.sub('arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/cdk-bootstrap/*'),
        ],
        actions: [
          'ssm:GetParameter',
        ],
      })
    )
  }
}

export default GitHubWebhookBuildRole
