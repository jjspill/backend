import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { bearerAuth } from 'hono/bearer-auth';

import experiences from './routes/experiences';
import account from './routes/account';
import subway from './routes/subway';

export const app = new Hono();

const token = process.env.AUTH_TOKEN || '';
if (!token) throw new Error('No token provided');

app.use('/*', bearerAuth({ token }));

app.get('/', (c) => {
  return c.json({ message: 'You are authorized' });
});

app.route('/experiences', experiences);
app.route('/account', account);
app.route('/subway', subway);

export const handler = handle(app);
