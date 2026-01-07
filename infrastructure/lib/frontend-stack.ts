import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly bucketName: string;
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for static website hosting
    this.bucket = new s3.Bucket(this, 'LibraryAppFrontendBucket', {
      bucketName: `library-app-frontend-spaceiron-${Math.random().toString(36).substring(7)}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false, // CloudFront will handle access
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Block all public access
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development - change for production
      autoDeleteObjects: true, // For development - change for production
    });

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'LibraryAppDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(30),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(30),
        },
      ],
    });

    // Export values for use in CI/CD
    this.bucketName = this.bucket.bucketName;
    this.distributionDomainName = this.distribution.distributionDomainName;

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 Bucket name for frontend deployment',
      exportName: 'LibraryApp-BucketName',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: 'LibraryApp-DistributionId',
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: 'LibraryApp-DistributionDomainName',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Website URL',
      exportName: 'LibraryApp-WebsiteURL',
    });
  }
}
