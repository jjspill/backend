import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { DynamoDB } from 'aws-sdk';
import moment from 'moment-timezone';

const dynamoDb = new DocumentClient();

interface StopInfo {
  stopId: string;
  stopName: string;
}

interface TrainUpdate {
  stopId: string;
  trainOrder: number;
  arrivalTime: string;
  routeId: string;
  tripId: string;
}

export const findClosestStations = async (
  lat: number,
  lon: number,
  maxDistance: number = 0.5, // Default max distance in miles
): Promise<{ stopId: string; stopName: string; distance: number }[]> => {
  try {
    let params: DynamoDB.DocumentClient.ScanInput = {
      TableName: 'SubwayStopsPreview',
      ProjectionExpression: 'stop_id, stop_name, stop_lat, stop_lon',
    };

    let stops: any[] = [];
    let items: DynamoDB.DocumentClient.ScanOutput;

    do {
      items = await dynamoDb.scan(params).promise();
      stops = stops.concat(items.Items);
      params.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (typeof items.LastEvaluatedKey !== 'undefined');

    const filteredStops = stops
      .filter(
        (stop: any) => stop.stop_id.endsWith('N') || stop.stop_id.endsWith('S'),
      )
      .map((stop: any) => {
        const distance = haversineDistance(
          lat,
          lon,
          parseFloat(stop.stop_lat),
          parseFloat(stop.stop_lon),
        );
        return { ...stop, distance };
      })
      .filter((stop: any) => stop.distance <= maxDistance)
      .sort((a: any, b: any) => a.distance - b.distance);

    return filteredStops.map((stop: any) => ({
      stopId: stop.stop_id,
      stopName: stop.stop_name,
      distance: stop.distance,
    }));
  } catch (error) {
    console.error('Failed to find closest stations:', error);
    throw error;
  }
};

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const toRadians = (degrees: number): number => degrees * (Math.PI / 180);
  const R = 3959; // Radius of the Earth in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
};

async function queryTrainUpdatesByStopId(
  stopId: string,
): Promise<TrainUpdate[]> {
  const params: DocumentClient.QueryInput = {
    TableName: 'GtfsHandlerTable',
    KeyConditionExpression:
      'stopId = :stopId AND trainOrder BETWEEN :start AND :end',
    ExpressionAttributeValues: {
      ':stopId': stopId,
      ':start': 1,
      ':end': 10,
    },
    ProjectionExpression: 'stopId, trainOrder, arrivalTime, routeId, tripId',
  };

  try {
    const data = await dynamoDb.query(params).promise();
    // const currentTime = moment();

    if (!data.Items) {
      return [];
    }

    // return data.Items.map((stop) => {
    //   return {
    //     arrivalTime: stop.arrivalTime,
    //     routeId: stop.routeId,
    //     tripId: stop.tripId,
    //     trainOrder: stop.trainOrder,
    //     stopId: stop.stopId,
    //   };
    // });

    return Promise.all(
      data.Items.map(async (stop) => {
        // const localArrivalTime = moment(stop.arrivalTime).tz(
        //   'America/New_York',
        // );
        // const diffMinutes = localArrivalTime.diff(moment(), 'minutes'); // Ensure you are comparing with the current time.
        // const expectedIn =
        //   diffMinutes <= 0
        //     ? null // Return null for past trains
        //     : diffMinutes <= 1
        //       ? 'arriving'
        //       : `${diffMinutes} minutes`;

        // if (!expectedIn) {
        //   return null; // This will filter out past or 'null' trains
        // }

        return {
          arrivalTime: stop.arrivalTime,
          routeId: stop.routeId,
          tripId: stop.tripId,
          trainOrder: stop.trainOrder,
          stopId: stop.stopId,
        };
      }),
    ).then((results) => results.filter((result) => result !== null));
  } catch (error) {
    console.error('Failed to query train updates:', error);
    throw error;
  }
}

// Main function to update and print train stops
export async function getTrainUpdates(
  latitude: number,
  longitude: number,
  distance: number,
): Promise<any> {
  const closestStops: StopInfo[] = await findClosestStations(
    latitude,
    longitude,
    distance,
  );

  const stopsWithTrains = await Promise.all(
    closestStops.map(async (stop) => {
      const trains = await queryTrainUpdatesByStopId(stop.stopId);
      return { ...stop, trains };
    }),
  );

  return stopsWithTrains;

  // stopsWithTrains.forEach((stop) => {
  //   console.log(
  //     `Stop: ${stop.stop_name} ${stop.stop_id.endsWith('N') ? '(Northbound)' : '(Southbound)'} (${stop.distance.toFixed(2)} miles)`,
  //   );
  //   stop.trains.forEach((train, index) => {
  //     console.log(
  //       `  Train ${index + 1}: Route ${train.routeId},  Arrives at ${train.time}`,
  //     );
  //   });
  // });
}
