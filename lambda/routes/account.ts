import { Hono } from 'hono';
import {
  cognitoISP,
  createUserAccount,
  deleteUserAccount,
  updateUserAccount,
} from '../helpers/accountHelpers';

const account = new Hono();

// Login Endpoint
account.post('/login', async (c) => {
  const { username, password } = await c.req.json();
  const clientId = process.env.COGNITO_APP_CLIENT_ID!;
  try {
    const loginResponse = await cognitoISP
      .initiateAuth({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      })
      .promise();

    if (loginResponse.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      return c.json({
        message: 'New password required',
        session: loginResponse.Session,
      });
    }

    if (loginResponse.AuthenticationResult) {
      return c.json({
        message: 'Login successful',
        accessToken: loginResponse.AuthenticationResult.AccessToken,
        refreshToken: loginResponse.AuthenticationResult.RefreshToken,
        idToken: loginResponse.AuthenticationResult.IdToken,
        expiresIn: loginResponse.AuthenticationResult.ExpiresIn,
      });
    } else {
      console.log(loginResponse);
      return c.json(
        { error: 'Authentication failed, no tokens received.' },
        401,
      );
    }
  } catch (error) {
    console.error('Error during authentication:', error);
    return c.json(
      {
        error: 'Authentication failed',
        details: error || 'An error occurred during authentication',
      },
      401,
    );
  }
});

// Create User Endpoint
account.post('/users', async (c) => {
  const { username, password, attributes } = await c.req.json();
  try {
    const userId = await createUserAccount({ username, password, attributes });
    return c.json({ message: 'User created successfully', userId });
  } catch (error) {
    console.error('Error creating user:', error);
    return c.json({ error: 'Failed to create user', details: error }, 400);
  }
});

// Update User Endpoint
account.put('/users/:username', async (c) => {
  const username = c.req.param('username');
  const attributes = await c.req.json();
  try {
    await updateUserAccount(username, attributes);
    return c.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ error: 'Failed to update user', details: error }, 400);
  }
});

// Delete User Endpoint
account.delete('/users/:username', async (c) => {
  const username = c.req.param('username');
  try {
    await deleteUserAccount(username);
    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user', details: error }, 400);
  }
});

account.post('/set-new-password', async (c) => {
  const { username, session, newPassword } = await c.req.json();

  try {
    const result = await cognitoISP
      .respondToAuthChallenge({
        ClientId: process.env.COGNITO_APP_CLIENT_ID!,
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        Session: session,
        ChallengeResponses: {
          USERNAME: username,
          NEW_PASSWORD: newPassword,
        },
      })
      .promise();

    return c.json({
      message: 'Password updated successfully',
      details: result,
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return c.json(
      {
        error: 'Failed to update password',
        details: error,
      },
      400,
    );
  }
});

export default account;
