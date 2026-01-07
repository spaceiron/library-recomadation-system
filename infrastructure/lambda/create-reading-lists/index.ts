import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({ region: 'eu-north-1' });
const docClient = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

interface CreateReadingListRequest {
  userId?: string;
  name: string;
  description?: string;
  bookIds?: string[];
}
function getUserIdFromEvent(event:APIGatewayProxyEvent):string{
  const claims = event.requestContext.authorizer?.claims;
  if(claims){
    return claims.sub || claims['cognito:username']
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
    const body: CreateReadingListRequest = JSON.parse(event.body || '{}');
    const userId = getUserIdFromEvent(event);

    if (!body.name || body.name.trim() === '') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'List name is required' }),
      };
    }
    
    const now = new Date().toISOString();

    const newList = {
      id: randomUUID(),
      userId: userId,
      name: body.name.trim(),
      description: body.description || '',
      bookIds: body.bookIds || [],
      createdAt: now,
      updateAt: now,
    };

    const command = new PutCommand({
      TableName: process.env.READING_LISTS_TABLE_NAME,
      Item: newList,
    });

    await docClient.send(command);

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify(newList),
    };
  } catch (error) {
    console.error('Error creating reading list:', error);

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to create reading list' }),
    };
  }
};
