import { Hono } from 'hono';
import { getTrainUpdates } from '../helpers/subwayHelpers';

const subway = new Hono();

subway.post('/', async (c) => {
  console.log('Subway endpoint');
  try {
    const { lat, long, distance } = await c.req.json();
    const stops = await getTrainUpdates(lat, long, distance);

    return c.json({ message: 'Subway endpoint', stops: stops });
  } catch (error) {
    console.error('Error getting subway updates:', error);
    return c.json({ error: 'Failed to get subway updates' }, 400);
  }
});

export default subway;
