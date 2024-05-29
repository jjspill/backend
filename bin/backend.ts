#!/usr/bin/env node
import 'dotenv/config';
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';

const app = new cdk.App();

const defaultAccount = process.env.CDK_DEFAULT_ACCOUNT;
const defaultRegion = process.env.CDK_DEFAULT_REGION;
const defaultAuthToken = process.env.AUTH_TOKEN!;

if (!defaultAuthToken) {
  console.error('AUTH_TOKEN is not defined.');
  process.exit(1);
}

// Production Stack
new BackendStack(app, 'BackendProdStack', {
  env: {
    account: defaultAccount,
    region: defaultRegion || 'us-east-1',
  },
  stackName: 'ProductionStack',
  isProd: true,
  authToken: defaultAuthToken,
});

// Preview Stack
new BackendStack(app, 'BackendPreviewStack', {
  env: {
    account: defaultAccount,
    region: defaultRegion || 'us-east-1',
  },
  stackName: 'PreviewStack',
  isProd: false,
  authToken: defaultAuthToken,
});
