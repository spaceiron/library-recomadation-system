import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-north-1' });
const docClient = DynamoDBDocumentClient.from(client);
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

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
    const bookId = event.pathParameters?.id;
    if (!bookId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Book ID is required' }),
      };
    }

    console.log('Looking for book ID:', bookId);
    console.log('Table name:', process.env.BOOKS_TABLE_NAME);

    const command = new GetCommand({
      TableName: process.env.BOOKS_TABLE_NAME,
      Key: { id: bookId },
    });
    const response = await docClient.send(command);

    console.log('DynamoDB response:', JSON.stringify(response, null, 2));

    if (!response.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Book not found',
          searchedId: bookId,
          tableName: process.env.BOOKS_TABLE_NAME,
        }),
      };
    }
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response.Item),
    };
  } catch (error) {
    console.error('Error fetching book: ', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to fetch the book.' }),
    };
  }
};
