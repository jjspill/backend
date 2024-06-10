// import { Hono } from 'hono';
// // import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
// import { S3 } from 'aws-sdk';

// interface TrainArrival {
//   arrivalTime: string;
//   tripId: string;
//   routeId: string;
//   destination: string;
// }

// interface DirectionDetail {
//   trains: TrainArrival[];
//   name: string;
// }

// interface StopDetail {
//   northbound: DirectionDetail;
//   southbound: DirectionDetail;
// }

// interface TrainData {
//   [stopId: string]: StopDetail;
// }

// const train = new Hono();
// const s3 = new S3();
// const bucketName = process.env.GTFS_BUCKET_NAME!;
// const key = 'train-schedule.json';
// let cachedData: TrainData | null = null;
// let lastETag: string | undefined = '';

// async function fetchTrainData(): Promise<void> {
//   const { ETag, Body } = await s3
//     .getObject({ Bucket: bucketName, Key: key })
//     .promise();

//   if (!ETag || ETag !== lastETag) {
//     console.log('Data has changed or first fetch, updating cache');
//     lastETag = ETag;
//     cachedData = JSON.parse(Body!.toString()) as TrainData;
//   } else {
//     console.log('Data unchanged, using cached version');
//   }
// }

// // Periodically update the data
// setInterval(fetchTrainData, 60000); // 1 minute

// train.post('/', async (c) => {
//   const { stopIds } = (await c.req.json()) as { stopIds: string[] };
//   await fetchTrainData(); // Ensure the data is up-to-date

//   const stops = stopIds.reduce(
//     (acc, stopId) => {
//       acc[stopId] = cachedData
//         ? cachedData[stopId]
//         : {
//             northbound: { trains: [], name: '' },
//             southbound: { trains: [], name: '' },
//           };
//       return acc;
//     },
//     {} as { [key: string]: StopDetail },
//   );

//   return c.json({ message: 'Train endpoint', stops: stops });
// });

// export default train;

// // Ensure initial data load on cold start
// fetchTrainData().catch(console.error);

// import { Hono } from 'hono';
// import { fetchTrainData, getTrainUpdates } from '../helpers/trainHelpers';

// const train = new Hono();

// train.post('/', async (c) => {
//   try {
//     await fetchTrainData();
//     const { stopIds } = await c.req.json();
//     // const stops = await getTrainUpdates(stopIds);
//     const stops = stopIds.reduce(
//       (acc, stopId) => {
//         acc[stopId] = cachedData
//           ? cachedData[stopId]
//           : {
//               northbound: { trains: [], name: '' },
//               southbound: { trains: [], name: '' },
//             };
//         return acc;
//       },
//       {} as { [key: string]: StopDetail },
//     );

//     return c.json({ message: 'Train endpoint', stops: stops });

//     return c.json({ message: 'Train endpoint', stops: stops });
//   } catch (error) {
//     console.error('Error getting Train updates:', error);
//     return c.json({ error: 'Failed to get Trains updates' }, 400);
//   }
// });

// export default train;

// fetchTrainData().catch(console.error);

// // Refresh data every 15 seconds
// setInterval(fetchTrainData, 15000);
