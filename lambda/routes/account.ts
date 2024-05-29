import { Hono } from 'hono';
import {
  cognitoISP,
  createUserAccount,
  deleteUserAccount,
  extractNameFromIdToken,
  getUserIdFromToken,
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
        username,
        name: extractNameFromIdToken(
          loginResponse.AuthenticationResult.IdToken!,
        ),
        accessToken: loginResponse.AuthenticationResult.AccessToken,
        refreshToken: loginResponse.AuthenticationResult.RefreshToken,
        idToken: loginResponse.AuthenticationResult.IdToken,
        expiresIn: loginResponse.AuthenticationResult.ExpiresIn,
        sub: getUserIdFromToken(loginResponse.AuthenticationResult.IdToken!),
      });
    } else {
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

// Create User Endpoint and Login
account.post('/users', async (c) => {
  const { username, password, attributes } = await c.req.json();

  attributes.append;
  try {
    const { Email, Tokens, Sub, Name, Session } = await createUserAccount({
      email: username,
      password,
      attributes,
    });
    return c.json({
      message: 'User created and logged in successfully',
      username: Email,
      name: Name,
      accessToken: Tokens.AccessToken,
      refreshToken: Tokens.RefreshToken,
      idToken: Tokens.IdToken,
      expiresIn: Tokens.ExpiresIn,
      sub: Sub,
    });
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

account.post('/change-password', async (c) => {
  const { accessToken, previousPassword, newPassword } = await c.req.json();

  try {
    const result = await cognitoISP
      .changePassword({
        AccessToken: accessToken,
        PreviousPassword: previousPassword,
        ProposedPassword: newPassword,
      })
      .promise();

    return c.json({
      message: 'Password changed successfully',
      details: result,
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return c.json(
      {
        error: 'Failed to change password',
        details: error,
      },
      400,
    );
  }
});

account.post('/forgot-password', async (c) => {
  const { username } = await c.req.json();
  try {
    const response = await cognitoISP
      .forgotPassword({
        ClientId: process.env.COGNITO_APP_CLIENT_ID!,
        Username: username,
      })
      .promise();

    return c.json({
      message: 'Password reset code sent successfully',
      details: response,
    });
  } catch (error) {
    console.error('Error sending reset password code:', error);
    return c.json(
      {
        error: 'Failed to send password reset code',
        details: error,
      },
      400,
    );
  }
});

account.post('/reset-password', async (c) => {
  const { username, code, newPassword } = await c.req.json();
  try {
    const response = await cognitoISP
      .confirmForgotPassword({
        ClientId: process.env.COGNITO_APP_CLIENT_ID!,
        Username: username,
        ConfirmationCode: code,
        Password: newPassword,
      })
      .promise();

    return c.json({
      message: 'Password reset successfully',
      details: response,
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return c.json(
      {
        error: 'Failed to reset password',
        details: error,
      },
      400,
    );
  }
});

export default account;
