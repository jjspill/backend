import { CognitoIdentityServiceProvider } from 'aws-sdk';

export const cognitoISP = new CognitoIdentityServiceProvider();

export interface UserAccount {
  username: string;
  password: string;
  attributes?: Record<string, string>;
}

// Create account
export const createUserAccount = async ({
  username,
  password,
  attributes,
}: UserAccount): Promise<string> => {
  const params = {
    UserPoolId: process.env.COGNITO_USER_POOL_ID as string,
    Username: username,
    TemporaryPassword: password,
    UserAttributes: Object.keys(attributes || {}).map((key) => ({
      Name: key,
      Value: attributes![key],
    })),
  };
  const response = await cognitoISP.adminCreateUser(params).promise();
  return response.User!.Username!;
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
