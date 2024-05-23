import * as AWS from 'aws-sdk';

export interface Document {
  title: string;
  path: string;
}

interface KeyFeature {
  feature: string;
  description: string;
}

export interface ExperienceData {
  title: string;
  description: string;
  long_text: string;
  key_features: KeyFeature[];
  youtube_video: string;
  technologies: string[];
  documents: Document[];
  link: string;
  priority: number;
}

export interface AWSInit {
  s3: AWS.S3;
  dynamoDb: AWS.DynamoDB.DocumentClient;
}

// Initialize AWS
export const initAWS = () => {
  AWS.config.update({ region: 'us-east-1' });

  const s3 = new AWS.S3({
    httpOptions: {
      timeout: 300000, // 5 minutes
      connectTimeout: 5000, // 5 seconds
    },
  });

  const dynamoDb = new AWS.DynamoDB.DocumentClient();
  return { s3, dynamoDb };
};

// Get a signed URL for an S3 object
const getSignedUrl = async (Key: string, s3: AWS.S3): Promise<string> => {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.BUCKET_NAME as string,
    Key,
    Expires: 60 * 60 * 24 * 7, // 1 week
  });
};

// Organizes the data to be saved in DynamoDB
// Some of this is weird from how it was originally organized in the frontend
export const prepareItemToSave = (data: ExperienceData) => ({
  id: data.title,
  ...data,
  key_features: data.key_features.map((feature) => ({
    feature: (feature as any)[0],
    description: (feature as any)[1],
  })),
  technologies: data.technologies,
  documents: data.documents.map((doc) => ({
    title: doc.title,
    path: doc.path,
  })),
});

// Saves the item to DynamoDB
export const saveItemToDynamoDB = async (
  item: ExperienceData,
  dynamoDb: AWS.DynamoDB.DocumentClient,
) => {
  const dbParams = {
    TableName: process.env.TABLE_NAME!,
    Item: item,
  };
  await dynamoDb.put(dbParams).promise();
};

// Gets all the experience data from DynamoDB
export const getExperienceData = async (
  dynamoDb: AWS.DynamoDB.DocumentClient,
) => {
  const params = {
    TableName: process.env.TABLE_NAME!,
  };
  const data = await dynamoDb.scan(params).promise();
  return data.Items || [];
};

// Gets a single experience item from DynamoDB
export const getExperienceItem = async (
  id: string,
  dynamoDb: AWS.DynamoDB.DocumentClient,
  s3: AWS.S3,
) => {
  const params = {
    TableName: process.env.TABLE_NAME!,
    Key: { id },
  };
  const data = await dynamoDb.get(params).promise();

  if (!data.Item) {
    throw new Error('Item not found');
  }

  for (const doc of data.Item.documents) {
    doc.path = await getSignedUrl(doc.path, s3);
  }
  return data.Item;
};

// Updates an experiences documents in DynamoDB
export const updateDynamoDBDocuments = async (
  document: Document,
  id: string,
  dynamoDb: AWS.DynamoDB.DocumentClient,
) => {
  const dbParams = {
    TableName: process.env.TABLE_NAME!,
    Key: { id: id },
    UpdateExpression: 'SET #documents = list_append(#documents, :document)',
    ExpressionAttributeNames: { '#documents': 'documents' },
    ExpressionAttributeValues: { ':document': [document] },
    ReturnValues: 'UPDATED_NEW',
  };
  await dynamoDb.update(dbParams).promise();
};

// Uploads documents to S3
// Returns an array of objects with the title and S3 path of the uploaded documents
// IMPORTANT: document.path CHANGES from base64 to the S3 path
export const uploadDocuments = async (
  documents: Document[],
  experience_title: string,
  s3: AWS.S3,
) => {
  return Promise.all(
    documents.map(async (doc) => {
      const newDocument = await handleDocumentUpload(doc, experience_title, s3);
      return { title: doc.title, path: newDocument.path };
    }),
  );
};

// Uploads a document to S3 using multipart upload
export const handleDocumentUpload = async (
  document: Document,
  id: string,
  s3: AWS.S3,
): Promise<Document> => {
  const objectKey = `pdf/${id}/${document.title.replace(/\s+/g, '-')}`;
  const multipartParams = {
    Bucket: process.env.BUCKET_NAME!,
    Key: objectKey,
    ContentType: 'application/pdf',
  };

  // Start the multipart upload process
  const multiPart = await s3.createMultipartUpload(multipartParams).promise();
  const multipartUploadId = multiPart.UploadId!;

  // Prepare the file for upload
  const fileBuffer = Buffer.from(document.path, 'base64');
  const partSize = 5 * 1024 * 1024; // 5 MB per part
  const partsCount = Math.ceil(fileBuffer.length / partSize);

  let partPromises = [];

  for (let part = 0; part < partsCount; part++) {
    const start = part * partSize;
    const end = Math.min(start + partSize, fileBuffer.length);
    const partParams = {
      Body: fileBuffer.slice(start, end),
      Bucket: multipartParams.Bucket,
      Key: multipartParams.Key,
      PartNumber: part + 1,
      UploadId: multipartUploadId,
    };

    // Upload each part and collect the promises
    partPromises.push(
      s3
        .uploadPart(partParams)
        .promise()
        .then((partData) => ({
          ETag: partData.ETag,
          PartNumber: part + 1,
        })),
    );
  }

  // Wait for all parts to be uploaded
  const uploadedParts = await Promise.all(partPromises);

  // Complete the multipart upload
  const completeParams = {
    Bucket: multipartParams.Bucket,
    Key: multipartParams.Key,
    MultipartUpload: {
      Parts: uploadedParts,
    },
    UploadId: multipartUploadId,
  };

  const completedUpload = await s3
    .completeMultipartUpload(completeParams)
    .promise();

  console.log(
    'Document uploaded to S3:',
    document.title,
    completedUpload.Location,
  );

  return {
    title: document.title,
    path: objectKey,
  };
};

// Get Authentication Result
export const getAuthResult = async (
  cognitoISP: any,
  username: string,
  password: string,
) => {
  const response = await cognitoISP
    .initiateAuth({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_APP_CLIENT_ID!,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    })
    .promise();

  return response?.AuthenticationResult;
};
