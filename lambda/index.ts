import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

import experiences from './routes/experiences';

export const app = new Hono();

app.route('experiences', experiences);

export const handler = handle(app);
