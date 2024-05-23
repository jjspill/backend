import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

import experiences from './routes/experiences';
import account from './routes/account';

export const app = new Hono();

app.route('/experiences', experiences);
app.route('/account', account);

export const handler = handle(app);
