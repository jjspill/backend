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
  authToken: string;
}

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // DynamoDB table(s)
    const experiencesTable = new dynamodb.Table(this, 'ExperienceTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      tableName: props.isProd ? 'ExperienceDataProd' : 'ExperienceDataPreview',
      removalPolicy: props.isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      tableName: props.isProd ? 'UsersDataProd' : 'UsersDataPreview',
      removalPolicy: props.isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // DynamoDB table for subway stops
    const subwayStopsTable = new dynamodb.Table(this, 'SubwayStops', {
      partitionKey: { name: 'stop_id', type: dynamodb.AttributeType.STRING },
      tableName: 'SubwayStopsPreview',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
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
    // const userPool = new cognito.UserPool(this, 'userPool', {
    //   userPoolName: props.isProd ? 'ProdUserPool' : 'PreviewUserPool',
    //   selfSignUpEnabled: true,
    //   autoVerify: { email: false },
    //   signInAliases: { email: true },
    //   passwordPolicy: {
    //     minLength: 8,
    //     requireLowercase: true,
    //     requireUppercase: true,
    //     requireDigits: true,
    //     requireSymbols: true,
    //   },
    //   removalPolicy: props.isProd
    //     ? cdk.RemovalPolicy.RETAIN
    //     : cdk.RemovalPolicy.DESTROY,

    //   customAttributes: {
    //     name: new cognito.StringAttribute({ mutable: true }),
    //   },
    // });

    const userPool = new cognito.UserPool(this, 'userPool', {
      userPoolName: props.isProd ? 'ProdUserPool' : 'PreviewUserPool',
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: cognito.Mfa.OFF,
      selfSignUpEnabled: true,
      signInAliases: {
        username: false, // Disable username, use email as primary identifier
        email: true, // Enable email as sign-in alias
      },
      autoVerify: {
        email: false,
      },
      standardAttributes: {
        email: {
          required: true, // Ensure email is required for each user
          mutable: true,
        },
        fullname: {
          required: true, // Ensure fullname is required for each user
          mutable: true,
        },
      },
      signInCaseSensitive: false,
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE,
        emailSubject: 'Reset your password',
        emailBody:
          "Your reset password code is {####}. Please enter this code to reset your password. If you didn't request a password reset, you can ignore this email.",
      },
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
      authFlows: { userPassword: true, adminUserPassword: true },
      generateSecret: false,
    });

    const gtfsHandlerTable = dynamodb.Table.fromTableName(
      this,
      'GtfsHandlerTable',
      'GtfsHandlerTable',
    );

    // Lambda function
    const fn = new NodejsFunction(this, 'backend-lambda', {
      entry: 'lambda/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(60),
      environment: {
        TABLE_NAME: experiencesTable.tableName,
        BUCKET_NAME: pdfBucket.bucketName,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_APP_CLIENT_ID: userPoolClient.userPoolClientId,
        AUTH_TOKEN: props.authToken,
        GTFS_HANDLER_TABLE_NAME: gtfsHandlerTable.tableName,
      },
    });

    experiencesTable.grantReadWriteData(fn);
    usersTable.grantReadWriteData(fn);
    pdfBucket.grantReadWrite(fn);
    subwayStopsTable.grantReadWriteData(fn);
    gtfsHandlerTable.grantReadData(fn);
    userPool.grant(fn, 'cognito-idp:AdminCreateUser');
    userPool.grant(fn, 'cognito-idp:AdminUpdateUserAttributes');
    userPool.grant(fn, 'cognito-idp:AdminDeleteUser');
    userPool.grant(fn, 'cognito-idp:AdminSetUserPassword');
    userPool.grant(fn, 'cognito-idp:AdminInitiateAuth');

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
