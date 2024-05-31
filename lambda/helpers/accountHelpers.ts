import { CognitoIdentityServiceProvider } from 'aws-sdk';
import jwt from 'jsonwebtoken';

export const cognitoISP = new CognitoIdentityServiceProvider();

export interface UserAccount {
  email: string;
  password: string;
  attributes?: Record<string, string>;
}

export interface UserReturn {
  Email: string;
  Tokens: any;
  Sub?: string;
  Name?: string;
  Session?: string;
}

export function getUserIdFromToken(idToken: string): string | undefined {
  try {
    const decoded = jwt.decode(idToken) as jwt.JwtPayload | null;
    if (decoded && typeof decoded === 'object' && 'sub' in decoded) {
      return decoded.sub;
    }
    console.warn('JWT token did not contain sub or was not decodable');
  } catch (error) {
    console.error('Error decoding token:', error);
  }
  return undefined;
}

// Function to extract the 'name' attribute
export function extractNameFromIdToken(idToken: string): string | undefined {
  try {
    const decoded = jwt.decode(idToken);
    return (decoded as any)['name']; // 'name' should match the key in the token claims
  } catch (error) {
    console.error('Failed to decode IdToken:', error);
    return undefined;
  }
}

export const createUserAccount = async ({
  email, // Changed from `username` to `email` to reflect the actual login identifier
  password,
  attributes,
}: UserAccount): Promise<UserReturn> => {
  const userPoolId = process.env.COGNITO_USER_POOL_ID as string;

  // Include 'email_verified' directly in the UserAttributes
  const userAttributes = [
    ...Object.keys(attributes || {}).map((key) => ({
      Name: key,
      Value: attributes ? attributes[key] : attributes,
    })),
    {
      Name: 'email',
      Value: email, // Add the email to the user attributes
    },
    {
      Name: 'email_verified',
      Value: 'true', // Automatically verify the email
    },
  ];

  // Create user with a temporary password and suppress the email
  const createUserParams = {
    UserPoolId: userPoolId,
    Username: email, // Use email as the username
    TemporaryPassword: password,
    UserAttributes: userAttributes,
    MessageAction: 'SUPPRESS', // Suppress the welcome email with the temporary password
  };
  const createUserResponse = await cognitoISP
    .adminCreateUser(createUserParams)
    .promise();

  // Set user password as permanent (optional step if you want to bypass the temporary password)
  const setPasswordParams = {
    Password: password,
    UserPoolId: userPoolId,
    Username: email, // Use email as the username
    Permanent: true,
  };
  await cognitoISP.adminSetUserPassword(setPasswordParams).promise();

  // Authenticate the user and get tokens
  const authParams = {
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    ClientId: process.env.COGNITO_APP_CLIENT_ID as string,
    UserPoolId: userPoolId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };
  const authResponse = await cognitoISP.adminInitiateAuth(authParams).promise();

  // Extract sub and other needed attributes from the ID token
  const sub = getUserIdFromToken(authResponse.AuthenticationResult!.IdToken!);

  return {
    Email: createUserResponse.User!.Username!,
    Tokens: authResponse.AuthenticationResult,
    Name: extractNameFromIdToken(authResponse.AuthenticationResult!.IdToken!),
    Sub: sub,
    Session: authResponse.Session,
  };
};

// Update account
export const updateUserAccount = async (
  username: string,
  attributes: Record<string, string>,
): Promise<string> => {
  const params = {
    UserPoolId: process.env.USER_POOL_ID as string,
    Username: username,
    UserAttributes: Object.keys(attributes).map((key) => ({
      Name: key,
      Value: attributes[key],
    })),
  };
  await cognitoISP.adminUpdateUserAttributes(params).promise();
  return username;
};

// Delete account
export const deleteUserAccount = async (username: string): Promise<string> => {
  const params = {
    UserPoolId: process.env.USER_POOL_ID as string,
    Username: username,
  };
  await cognitoISP.adminDeleteUser(params).promise();
  return username;
};
