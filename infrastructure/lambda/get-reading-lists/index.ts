import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-north-1' });
const docClient = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

function getUserIdFromEvent(event: APIGatewayProxyEvent): string {
  const claims = event.requestContext.authorizer?.claims;
  if (claims) {
    return claims.sub || claims['cognito:username'];
  }
  return event.queryStringParameters?.userId || 'anonymous';
}
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    };
  }
  console.log('Event: ', JSON.stringify(event, null, 2));

  try {
    const userId = getUserIdFromEvent(event);
    console.log('Fetching reading lists for userId:', userId);

    // Try to get reading lists for current userId
    let command = new QueryCommand({
      TableName: process.env.READING_LISTS_TABLE_NAME,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    });

    let response = await docClient.send(command);
    let items = response.Items || [];

    console.log(`Found ${items.length} reading lists for userId: ${userId}`);

    // If no items found and userId is not '1', also try with mock userId '1'
    if (items.length === 0 && userId !== '1') {
      console.log('No lists found for current user, trying mock userId "1"');

      command = new QueryCommand({
        TableName: process.env.READING_LISTS_TABLE_NAME,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': '1',
        },
      });

      response = await docClient.send(command);
      const mockItems = response.Items || [];
      console.log(`Found ${mockItems.length} reading lists for mock userId "1"`);

      // Return mock items but don't modify them in place
      items = mockItems;
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(items),
    };
  } catch (error) {
    console.error('Error fetching reading lists: ', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to fetch reading lists.' }),
    };
  }
};
