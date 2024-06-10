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
// }f

// const s3 = new S3();
// const bucketName = process.env.BUCKET_NAME!;
// const key = 'trainUpdates.json';

// let cachedData: TrainData | null = null;
// let lastETag: string | undefined = '';

// export async function fetchTrainData(): Promise<void> {
//   try {
//     const { ETag, Body } = await s3
//       .getObject({ Bucket: bucketName, Key: key })
//       .promise();

//     if (ETag !== lastETag) {
//       console.log('Data has changed, updating cache');
//       lastETag = ETag;
//       cachedData = JSON.parse(Body!.toString()) as TrainData;
//     } else {
//       console.log('Data unchanged, using cached version');
//     }
//   } catch (error) {
//     console.error('Error fetching train data from S3:', error);
//     throw error;
//   }
// }

// // import { DocumentClient } from 'aws-sdk/clients/dynamodb';

// // const dynamoDb = new DocumentClient();

// // async function queryTrainUpdatesByStopId(stopId: string): Promise<any> {
// //   const params: DocumentClient.QueryInput = {
// //     TableName: process.env.GTFS_HANDLER_TABLE_NAME!,
// //     KeyConditionExpression: 'stopId = :stopId',
// //     ExpressionAttributeValues: {
// //       ':stopId': stopId,
// //     },
// //     ProjectionExpression: 'stopId, northbound, southbound',
// //   };

// //   try {
// //     const data = await dynamoDb.query(params).promise();

// //     if (!data.Items) {
// //       return [];
// //     }

// //     return data.Items;
// //   } catch (error) {
// //     console.error('Failed to query train updates:', error);
// //     throw error;
// //   }
// // }

// // // Main function to update and print train stops
// // export async function getTrainUpdates(stopIds: string[]): Promise<any> {
// //   const stopsWithTrains = await Promise.all(
// //     stopIds.map(async (stop) => {
// //       const stopsData = await queryTrainUpdatesByStopId(stop);
// //       return stopsData.flat();
// //     }),
// //   );
// //   const flatStopsWithTrains = stopsWithTrains.flat();
// //   return flatStopsWithTrains;
// // }
