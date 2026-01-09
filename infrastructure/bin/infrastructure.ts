#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '../lib/api-stack';
import { DatabaseStack } from '../lib/database-stack';
import { AuthStack } from '../lib/auth-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const databaseStack = new DatabaseStack(app, 'MyLibraryDatabaseStack', { env });
const authStack = new AuthStack(app, 'MyLibraryAuthStack', { env });
const frontendStack = new FrontendStack(app, 'MyLibraryFrontendStack', { env });

const apiStack = new ApiStack(app, 'MyLibraryApiStack', {
  env,
  booksTable: databaseStack.booksTable,
  readingListsTable: databaseStack.readingListsTable,
  userPool: authStack.userPool,
  frontendUrl: `https://${frontendStack.distributionDomainName}`,
});

// CI/CD Pipeline Stack
const pipelineStack = new PipelineStack(app, 'MyLibraryPipelineStack', {
  env,
  githubOwner: 'spaceiron', // Your GitHub username
  githubRepo: 'library-recomadation-system', // Your repo name
  githubBranch: 'main',
});

apiStack.addDependency(databaseStack);
apiStack.addDependency(authStack);
