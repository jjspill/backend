#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';

const app = new cdk.App();

const defaultAccount = process.env.CDK_DEFAULT_ACCOUNT;
const defaultRegion = process.env.CDK_DEFAULT_REGION;

// Production Stack
new BackendStack(app, 'BackendProdStack', {
  env: {
    account: defaultAccount,
    region: defaultRegion || 'us-east-1',
  },
  stackName: 'ProductionStack',
  isProd: true,
});

// Preview Stack
new BackendStack(app, 'BackendPreviewStack', {
  env: {
    account: defaultAccount,
    region: defaultRegion || 'us-east-1',
  },
  stackName: 'PreviewStack',
  isProd: false,
});
