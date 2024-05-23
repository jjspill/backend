import { cors } from 'hono/cors';
import { Hono } from 'hono';
import { app } from '../lambda/index';

app.use(
  '/*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

export default {
  port: 3001,
  fetch: app.fetch,
};
