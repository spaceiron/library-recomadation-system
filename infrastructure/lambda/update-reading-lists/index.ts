import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-north-1' });
const docClient = DynamoDBDocumentClient.from(client);

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

interface UpdateReadingListRequest {
  listId: string;
  userId?: string;
  name?: string;
  description?: string;
  bookIds?: string[];
}
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
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const body: UpdateReadingListRequest = JSON.parse(event.body || '{}');
    const userId = getUserIdFromEvent(event);
    const listId = event.pathParameters?.id;

    if (!listId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'List ID is required' }),
      };
    }

    console.log('Attempting to update reading list:', { listId, userId, body });

    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, string | string[]> = {};

    if (body.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = body.name;
    }

    if (body.description !== undefined) {
      updateExpressions.push('description = :desc');
      expressionAttributeValues[':desc'] = body.description;
    }

    if (body.bookIds !== undefined) {
      updateExpressions.push('bookIds = :bookIds');
      expressionAttributeValues[':bookIds'] = body.bookIds;
    }

    // Always update updatedAt
    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    // Try with current userId first
    let command = new UpdateCommand({
      TableName: process.env.READING_LISTS_TABLE_NAME,
      Key: {
        id: listId,
        userId: userId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames:
        Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    try {
      const response = await docClient.send(command);
      console.log('Successfully updated with current userId:', userId);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(response.Attributes),
      };
    } catch (updateError: any) {
      console.log('Failed with current userId, trying with mock userId "1":', updateError.message);

      // If update fails, try with mock userId '1' (for existing mock data)
      if (
        updateError.name === 'ConditionalCheckFailedException' ||
        updateError.message?.includes('does not exist')
      ) {
        command = new UpdateCommand({
          TableName: process.env.READING_LISTS_TABLE_NAME,
          Key: {
            id: listId,
            userId: '1', // Try with mock userId
          },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames:
            Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW',
        });

        try {
          const response = await docClient.send(command);
          console.log('Successfully updated with mock userId "1"');
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(response.Attributes),
          };
        } catch (mockUpdateError: any) {
          console.error('Failed with both userIds:', {
            userId,
            mockUserId: '1',
            error: mockUpdateError.message,
          });
          throw mockUpdateError;
        }
      } else {
        throw updateError;
      }
    }
  } catch (error: any) {
    console.error('Error updating reading list:', error);

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to update reading list',
        details: error.message,
      }),
    };
  }
};
