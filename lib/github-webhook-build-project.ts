import { Construct } from 'constructs'
import { BuildEnvironmentVariableType, BuildSpec, LinuxBuildImage, PipelineProject, PipelineProjectProps } from 'aws-cdk-lib/aws-codebuild'
import { Role } from 'aws-cdk-lib/aws-iam'

export interface IGitHubWebhookBuildProjectProps extends PipelineProjectProps {
  readonly stackNamePrefix: string
  readonly stage: string
  readonly role: Role
  readonly contact: string
  readonly owner: string
}

export default class GitHubWebhookBuildProject extends PipelineProject {
  constructor(scope: Construct, id: string, props: IGitHubWebhookBuildProjectProps) {
    const stackName = `${props.stackNamePrefix}-${props.stage}`
    const projectProps = {
      environment: {
        buildImage: LinuxBuildImage.STANDARD_5_0,
        environmentVariables: {
          CI: {
            value: 'true',
            type: BuildEnvironmentVariableType.PLAINTEXT,
          },
        },
      },
      role: props.role,
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '14.x',
            },
            commands: [
              'chmod -R 755 ./setup.sh',
              './setup.sh',
            ],
          },
          build: {
            commands: [`
              npm run -- cdk deploy ${stackName} \
                -c serviceStackName="${stackName}" \
                -c stage="${props.stage}" \
                -c contact="${props.contact}" \
                -c owner="${props.owner}" \
                --require-approval=never
            `],
          },
        },
      }),
    }
    super(scope, id, projectProps)
  }
}
