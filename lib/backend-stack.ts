import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';

interface BackendStackProps extends cdk.StackProps {
  isProd: boolean;
}

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // DynamoDB table(s)
    const table = new dynamodb.Table(this, 'ExperienceTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      tableName: props.isProd ? 'ExperienceDataProd' : 'ExperienceDataPreview',
      removalPolicy: props.isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // S3 Bucket for storing PDFs
    const pdfBucket = new s3.Bucket(this, 'pdfBucket', {
      bucketName: props.isProd ? 'backend-prod-pdfs' : 'backend-preview-pdfs',
      removalPolicy: props.isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !props.isProd,
      publicReadAccess: false,
      versioned: true,
    });

    // Cognito User Pool for authentication
    const userPool = new cognito.UserPool(this, 'userPool', {
      userPoolName: props.isProd ? 'ProdUserPool' : 'PreviewUserPool',
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      removalPolicy: props.isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // Cognito User Pool Client for the Lambda function
    const userPoolClient = new cognito.UserPoolClient(this, 'userPoolClient', {
      userPool,
      authFlows: { userPassword: true },
      generateSecret: false,
    });

    // Lambda function
    const fn = new NodejsFunction(this, 'backend-lambda', {
      entry: 'lambda/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(60),
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: pdfBucket.bucketName,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_APP_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    table.grantReadWriteData(fn);
    pdfBucket.grantReadWrite(fn);
    userPool.grant(fn, 'cognito-idp:AdminCreateUser');
    userPool.grant(fn, 'cognito-idp:AdminUpdateUserAttributes');
    userPool.grant(fn, 'cognito-idp:AdminDeleteUser');

    // const certificateArn =
    //   'arn:aws:acm:us-east-1:917740396733:certificate/b058dc50-8c9d-4fb5-bc9e-de47ceafc874';

    // const certificate = acm.Certificate.fromCertificateArn(
    //   this,
    //   'APICert',
    //   certificateArn,
    // );

    // const domainName = new apigateway.DomainName(this, 'APIDomain', {
    //   domainName: props.isProd
    //     ? 'api.james-spillmann.com'
    //     : 'preview.api.james-spillmann.com',
    //   certificate: certificate,
    //   // Make sure endpoint configuration and other properties are correctly set up
    //   endpointType: apigateway.EndpointType.REGIONAL,
    //   securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
    // });

    // API Gateway REST API
    new apigateway.LambdaRestApi(this, 'backend-api', {
      handler: fn,
      proxy: true,
      restApiName: props.isProd ? 'ProdAPI' : 'PreviewAPI',
      // domainName: {
      //   certificate: certificate,
      //   // domainName: domainName.domainName,
      //   endpointType: apigateway.EndpointType.REGIONAL,
      //   securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
      // },
    });
  }
}
