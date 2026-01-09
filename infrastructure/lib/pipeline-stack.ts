import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface PipelineStackProps extends cdk.StackProps {
  githubOwner: string;
  githubRepo: string;
  githubBranch?: string;
}

export class PipelineStack extends cdk.Stack {
  public readonly pipeline: codepipeline.Pipeline;
  public readonly websiteBucket: s3.IBucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    // Create new S3 Bucket for pipeline
    this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `library-app-frontend-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false, // CloudFront will handle access
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Origin Access Control for CloudFront
    const originAccessControl = new cloudfront.S3OriginAccessControl(this, 'OAC', {
      description: 'OAC for library app',
    });

    // CloudFront Distribution with OAC
    this.distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket, {
          originAccessControl,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // Grant CloudFront access to S3 bucket
    this.websiteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        actions: ['s3:GetObject'],
        resources: [`${this.websiteBucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${this.distribution.distributionId}`,
          },
        },
      })
    );

    // CodeBuild Project
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      projectName: 'library-app-build',
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      environmentVariables: {
        VITE_API_BASE_URL: {
          value: 'https://zj5w3d20sj.execute-api.us-east-1.amazonaws.com/prod',
        },
        VITE_USER_POOL_ID: {
          value: 'us-east-1_hjVzHFEmX',
        },
        VITE_USER_POOL_CLIENT_ID: {
          value: '4dq8dc13mj51p0b3gjkpqogevt',
        },
        VITE_AWS_REGION: {
          value: 'us-east-1',
        },
        S3_BUCKET: {
          value: this.websiteBucket.bucketName,
        },
        CLOUDFRONT_DISTRIBUTION_ID: {
          value: this.distribution.distributionId,
        },
      },
    });

    // Grant permissions to CodeBuild to access S3 and CloudFront
    this.websiteBucket.grantReadWrite(buildProject);

    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudfront:CreateInvalidation',
          'cloudfront:GetInvalidation',
          'cloudfront:ListInvalidations',
        ],
        resources: [
          `arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${this.distribution.distributionId}`,
        ],
      })
    );

    // Artifacts
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // GitHub connection using CodeStar Connections (more reliable than webhook)
    const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: 'GitHub_Source',
      owner: props.githubOwner,
      repo: props.githubRepo,
      branch: props.githubBranch || 'main',
      connectionArn:
        'arn:aws:codestar-connections:us-east-1:690897925354:connection/c8c77f27-fd44-44a0-aee8-1eb70b832a97',
      output: sourceOutput,
    });

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'CodeBuild',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
    });

    const deployAction = new codepipeline_actions.S3DeployAction({
      actionName: 'S3_Deploy',
      bucket: this.websiteBucket,
      input: buildOutput,
      runOrder: 1,
    });

    // Invalidate CloudFront cache after deployment
    const invalidateProject = new codebuild.PipelineProject(this, 'InvalidateProject', {
      projectName: 'library-app-invalidate',
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              `aws cloudfront create-invalidation --distribution-id ${this.distribution.distributionId} --paths "/*"`,
            ],
          },
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
      },
    });

    // Grant CloudFront permissions to invalidate project
    invalidateProject.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudfront:CreateInvalidation',
          'cloudfront:GetInvalidation',
          'cloudfront:ListInvalidations',
        ],
        resources: [
          `arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${this.distribution.distributionId}`,
        ],
      })
    );

    const invalidateAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'InvalidateCache',
      project: invalidateProject,
      input: buildOutput,
      runOrder: 2,
    });

    // Create Pipeline
    this.pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'library-app-pipeline',
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        {
          stageName: 'Build',
          actions: [buildAction],
        },
        {
          stageName: 'Deploy',
          actions: [deployAction, invalidateAction],
        },
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Website URL',
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: this.websiteBucket.bucketName,
      description: 'S3 Bucket Name',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'PipelineName', {
      value: this.pipeline.pipelineName,
      description: 'CodePipeline Name',
    });
  }
}
