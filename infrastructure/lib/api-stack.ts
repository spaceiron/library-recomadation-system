import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface ApiStackProps extends cdk.StackProps {
  booksTable: dynamodb.ITable;
  readingListsTable: dynamodb.ITable;
  userPool: cognito.UserPool;
  frontendUrl?: string;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Create REST API
    this.api = new apigateway.RestApi(this, 'LibraryAPI', {
      restApiName: 'My Library API',
      description: 'API for Library Recommendation System',
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Create simple Lambda function using inline code (no Docker needed)
    const getBooksFunction = new lambda.Function(this, 'GetBooksFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
        
        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);
        
        exports.handler = async (event) => {
          const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
          };
          
          if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
          }
          
          try {
            // Check if this is a single book request (has path parameter)
            const bookId = event.pathParameters?.id;
            
            if (bookId) {
              // Get single book
              const command = new GetCommand({
                TableName: process.env.BOOKS_TABLE_NAME,
                Key: { id: bookId }
              });
              const response = await docClient.send(command);
              
              if (!response.Item) {
                return {
                  statusCode: 404,
                  headers,
                  body: JSON.stringify({ error: 'Book not found' }),
                };
              }
              
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.Item),
              };
            } else {
              // Get all books
              const command = new ScanCommand({
                TableName: process.env.BOOKS_TABLE_NAME,
              });
              const response = await docClient.send(command);
              return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ response }),
              };
            }
          } catch (error) {
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Failed to fetch books' }),
            };
          }
        };
      `),
      environment: {
        BOOKS_TABLE_NAME: props.booksTable.tableName,
      },
    });

    // Grant permissions
    props.booksTable.grantReadData(getBooksFunction);

    // Create Book Function (Admin only)
    const createBookFunction = new lambda.Function(this, 'CreateBookFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
        const { randomUUID } = require('crypto');
        
        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);
        
        function getUserIdFromEvent(event) {
          const claims = event.requestContext.authorizer?.claims;
          if (claims) {
            return claims.sub || claims['cognito:username'];
          }
          return event.queryStringParameters?.userId || 'anonymous';
        }
        
        exports.handler = async (event) => {
          const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
          };
          
          if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
          }
          
          try {
            const body = JSON.parse(event.body || '{}');
            const userId = getUserIdFromEvent(event);
            
            console.log('Creating book for userId:', userId);
            
            // Generate a new book with UUID
            const book = {
              id: randomUUID(),
              title: body.title,
              author: body.author,
              genre: body.genre || '',
              description: body.description || '',
              coverImage: body.coverImage || '',
              rating: body.rating || 0,
              publishedYear: body.publishedYear || new Date().getFullYear(),
              isbn: body.isbn || '',
            };
            
            const command = new PutCommand({
              TableName: process.env.BOOKS_TABLE_NAME,
              Item: book,
            });
            
            await docClient.send(command);
            
            return {
              statusCode: 201,
              headers,
              body: JSON.stringify(book),
            };
          } catch (error) {
            console.error('Error creating book:', error);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Failed to create book' }),
            };
          }
        };
      `),
      environment: {
        BOOKS_TABLE_NAME: props.booksTable.tableName,
      },
    });

    // Grant permissions for creating books
    props.booksTable.grantWriteData(createBookFunction);

    // Update Book Function (Admin only)
    const updateBookFunction = new lambda.Function(this, 'UpdateBookFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
        
        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);
        
        function getUserIdFromEvent(event) {
          const claims = event.requestContext.authorizer?.claims;
          if (claims) {
            return claims.sub || claims['cognito:username'];
          }
          return event.queryStringParameters?.userId || 'anonymous';
        }
        
        exports.handler = async (event) => {
          const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'PUT,OPTIONS',
          };
          
          if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
          }
          
          try {
            const bookId = event.pathParameters?.id;
            const body = JSON.parse(event.body || '{}');
            const userId = getUserIdFromEvent(event);
            
            if (!bookId) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Book ID is required' }),
              };
            }
            
            console.log('Updating book for userId:', userId);
            
            // Build update expression dynamically
            const updateExpressions = [];
            const expressionAttributeNames = {};
            const expressionAttributeValues = {};

            if (body.title !== undefined) {
              updateExpressions.push('title = :title');
              expressionAttributeValues[':title'] = body.title;
            }

            if (body.author !== undefined) {
              updateExpressions.push('author = :author');
              expressionAttributeValues[':author'] = body.author;
            }

            if (body.genre !== undefined) {
              updateExpressions.push('genre = :genre');
              expressionAttributeValues[':genre'] = body.genre;
            }

            if (body.description !== undefined) {
              updateExpressions.push('description = :description');
              expressionAttributeValues[':description'] = body.description;
            }

            if (body.coverImage !== undefined) {
              updateExpressions.push('coverImage = :coverImage');
              expressionAttributeValues[':coverImage'] = body.coverImage;
            }

            if (body.rating !== undefined) {
              updateExpressions.push('rating = :rating');
              expressionAttributeValues[':rating'] = body.rating;
            }

            if (body.publishedYear !== undefined) {
              updateExpressions.push('publishedYear = :publishedYear');
              expressionAttributeValues[':publishedYear'] = body.publishedYear;
            }

            if (body.isbn !== undefined) {
              updateExpressions.push('isbn = :isbn');
              expressionAttributeValues[':isbn'] = body.isbn;
            }

            if (updateExpressions.length === 0) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'No fields to update' }),
              };
            }
            
            const command = new UpdateCommand({
              TableName: process.env.BOOKS_TABLE_NAME,
              Key: { id: bookId },
              UpdateExpression: \`SET \${updateExpressions.join(', ')}\`,
              ExpressionAttributeNames:
                Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
              ExpressionAttributeValues: expressionAttributeValues,
              ReturnValues: 'ALL_NEW',
            });
            
            const response = await docClient.send(command);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(response.Attributes),
            };
          } catch (error) {
            console.error('Error updating book:', error);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Failed to update book' }),
            };
          }
        };
      `),
      environment: {
        BOOKS_TABLE_NAME: props.booksTable.tableName,
      },
    });

    // Grant permissions for updating books
    props.booksTable.grantReadWriteData(updateBookFunction);

    // Reading Lists Lambda Functions
    const getReadingListsFunction = new lambda.Function(this, 'GetReadingListsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
        
        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);
        
        function getUserIdFromEvent(event) {
          const claims = event.requestContext.authorizer?.claims;
          if (claims) {
            return claims.sub || claims['cognito:username'];
          }
          return event.queryStringParameters?.userId || 'anonymous';
        }
        
        exports.handler = async (event) => {
          const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
          };
          
          if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
          }
          
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
            
            console.log(\`Found \${items.length} reading lists for userId: \${userId}\`);
            
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
              console.log(\`Found \${mockItems.length} reading lists for mock userId "1"\`);
              
              // Return mock items but don't modify them in place
              items = mockItems;
            }
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(items),
            };
          } catch (error) {
            console.error('Error fetching reading lists:', error);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Failed to fetch reading lists' }),
            };
          }
        };
      `),
      environment: {
        READING_LISTS_TABLE_NAME: props.readingListsTable.tableName,
      },
    });

    const createReadingListFunction = new lambda.Function(this, 'CreateReadingListFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
        const { randomUUID } = require('crypto');
        
        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);
        
        function getUserIdFromEvent(event) {
          const claims = event.requestContext.authorizer?.claims;
          if (claims) {
            return claims.sub || claims['cognito:username'];
          }
          return event.queryStringParameters?.userId || 'anonymous';
        }
        
        exports.handler = async (event) => {
          const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
          };
          
          if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
          }
          
          try {
            const body = JSON.parse(event.body || '{}');
            const userId = getUserIdFromEvent(event);
            const now = new Date().toISOString();
            
            console.log('Creating reading list for userId:', userId);
            
            const readingList = {
              id: randomUUID(),
              userId: userId,
              name: body.name,
              description: body.description || '',
              bookIds: body.bookIds || [],
              isPublic: body.isPublic || false,
              createdAt: now,
              updatedAt: now,
            };
            
            const command = new PutCommand({
              TableName: process.env.READING_LISTS_TABLE_NAME,
              Item: readingList,
            });
            
            await docClient.send(command);
            
            return {
              statusCode: 201,
              headers,
              body: JSON.stringify(readingList),
            };
          } catch (error) {
            console.error('Error creating reading list:', error);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Failed to create reading list' }),
            };
          }
        };
      `),
      environment: {
        READING_LISTS_TABLE_NAME: props.readingListsTable.tableName,
      },
    });

    // Grant permissions for reading lists
    props.readingListsTable.grantReadData(getReadingListsFunction);
    props.readingListsTable.grantWriteData(createReadingListFunction);

    // Update Reading List Function
    const updateReadingListFunction = new lambda.Function(this, 'UpdateReadingListFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
        
        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);
        
        function getUserIdFromEvent(event) {
          const claims = event.requestContext.authorizer?.claims;
          if (claims) {
            return claims.sub || claims['cognito:username'];
          }
          return event.queryStringParameters?.userId || 'anonymous';
        }
        
        exports.handler = async (event) => {
          const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'PUT,OPTIONS',
          };
          
          if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
          }
          
          try {
            const listId = event.pathParameters?.id;
            const body = JSON.parse(event.body || '{}');
            const userId = getUserIdFromEvent(event);
            const now = new Date().toISOString();
            
            if (!listId) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'List ID is required' }),
              };
            }

            console.log('Attempting to update reading list:', { listId, userId, body });

            // Build update expression dynamically
            const updateExpressions = [];
            const expressionAttributeNames = {};
            const expressionAttributeValues = {};

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
            expressionAttributeValues[':updatedAt'] = now;

            // Try with current userId first
            let command = new UpdateCommand({
              TableName: process.env.READING_LISTS_TABLE_NAME,
              Key: {
                id: listId,
                userId: userId,
              },
              UpdateExpression: \`SET \${updateExpressions.join(', ')}\`,
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
                headers,
                body: JSON.stringify(response.Attributes),
              };
            } catch (updateError) {
              console.log('Failed with current userId, trying with mock userId "1":', updateError.message);
              
              // If update fails, try with mock userId '1' (for existing mock data)
              if (updateError.name === 'ConditionalCheckFailedException' || updateError.message?.includes('does not exist')) {
                command = new UpdateCommand({
                  TableName: process.env.READING_LISTS_TABLE_NAME,
                  Key: {
                    id: listId,
                    userId: '1', // Try with mock userId
                  },
                  UpdateExpression: \`SET \${updateExpressions.join(', ')}\`,
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
                    headers,
                    body: JSON.stringify(response.Attributes),
                  };
                } catch (mockUpdateError) {
                  console.error('Failed with both userIds:', { userId, mockUserId: '1', error: mockUpdateError.message });
                  throw mockUpdateError;
                }
              } else {
                throw updateError;
              }
            }
          } catch (error) {
            console.error('Error updating reading list:', error);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ 
                error: 'Failed to update reading list',
                details: error.message 
              }),
            };
          }
        };
      `),
      environment: {
        READING_LISTS_TABLE_NAME: props.readingListsTable.tableName,
      },
    });

    // Delete Reading List Function
    const deleteReadingListFunction = new lambda.Function(this, 'DeleteReadingListFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
        
        const client = new DynamoDBClient({});
        const docClient = DynamoDBDocumentClient.from(client);
        
        exports.handler = async (event) => {
          const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
          };
          
          if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
          }
          
          try {
            const listId = event.pathParameters?.id;
            
            const command = new DeleteCommand({
              TableName: process.env.READING_LISTS_TABLE_NAME,
              Key: { 
                id: listId,
                userId: 'temp-user-id' // Will be replaced with real user ID
              }
            });
            
            await docClient.send(command);
            
            return {
              statusCode: 204,
              headers,
              body: '',
            };
          } catch (error) {
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Failed to delete reading list' }),
            };
          }
        };
      `),
      environment: {
        READING_LISTS_TABLE_NAME: props.readingListsTable.tableName,
      },
    });

    props.readingListsTable.grantReadWriteData(updateReadingListFunction);
    props.readingListsTable.grantReadWriteData(deleteReadingListFunction);

    // AI Recommendations Lambda Function
    const getRecommendationsFunction = new lambda.Function(this, 'GetRecommendationsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromInline(`
        const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
        
        const client = new BedrockRuntimeClient({ region: 'us-east-1' });
        
        exports.handler = async (event) => {
          const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
          };
          
          if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
          }
          
          try {
            const body = JSON.parse(event.body || '{}');
            const query = body.query;
            
            if (!query) {
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Query is required' }),
              };
            }
            
            // For now, return mock recommendations since Bedrock requires additional setup
            const mockRecommendations = [
              {
                title: "The Silent Patient",
                author: "Alex Michaelides",
                reason: "A gripping psychological thriller that matches your interest in mystery novels with complex characters and unexpected twists.",
                confidence: 0.92
              },
              {
                title: "Gone Girl",
                author: "Gillian Flynn",
                reason: "A dark psychological thriller with unreliable narrators and a twisted plot that will keep you guessing until the end.",
                confidence: 0.88
              },
              {
                title: "The Girl with the Dragon Tattoo",
                author: "Stieg Larsson",
                reason: "A compelling mystery featuring a strong female protagonist and intricate plot that combines journalism and detective work.",
                confidence: 0.85
              }
            ];
            
            // TODO: Replace with actual Bedrock API call
            // const prompt = \`Based on this request: "\${query}", recommend 3 books with title, author, reason, and confidence score.\`;
            // const command = new InvokeModelCommand({
            //   modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
            //   body: JSON.stringify({
            //     anthropic_version: 'bedrock-2023-05-31',
            //     max_tokens: 1000,
            //     messages: [{ role: 'user', content: prompt }]
            //   })
            // });
            // const response = await client.send(command);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ recommendations: mockRecommendations }),
            };
          } catch (error) {
            console.error('Error getting recommendations:', error);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Failed to get recommendations' }),
            };
          }
        };
      `),
    });

    // Grant Bedrock permissions (commented out for now)
    // getRecommendationsFunction.addToRolePolicy(new iam.PolicyStatement({
    //   effect: iam.Effect.ALLOW,
    //   actions: ['bedrock:InvokeModel'],
    //   resources: ['arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0']
    // }));

    // Create API Gateway resources
    const getBooksResource = this.api.root.addResource('getBooks');
    getBooksResource.addMethod('GET', new apigateway.LambdaIntegration(getBooksFunction));

    // Add single book endpoint
    const getBookByIdResource = getBooksResource.addResource('{id}');
    getBookByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getBooksFunction));

    // Books management endpoints
    const booksResource = this.api.root.addResource('books');
    booksResource.addMethod('POST', new apigateway.LambdaIntegration(createBookFunction));

    // Individual book endpoints (PUT)
    const bookByIdResource = booksResource.addResource('{id}');
    bookByIdResource.addMethod('PUT', new apigateway.LambdaIntegration(updateBookFunction));

    // Reading Lists API endpoints
    const readingListsResource = this.api.root.addResource('reading-lists');
    readingListsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getReadingListsFunction)
    );
    readingListsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createReadingListFunction)
    );

    // Individual reading list endpoints (PUT and DELETE)
    const readingListByIdResource = readingListsResource.addResource('{id}');
    readingListByIdResource.addMethod(
      'PUT',
      new apigateway.LambdaIntegration(updateReadingListFunction)
    );
    readingListByIdResource.addMethod(
      'DELETE',
      new apigateway.LambdaIntegration(deleteReadingListFunction)
    );

    // AI Recommendations API endpoint
    const recommendationsResource = this.api.root.addResource('recommendations');
    recommendationsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(getRecommendationsFunction)
    );

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
    });
  }
}
