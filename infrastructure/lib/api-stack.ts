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

    // Reading Lists Lambda Functions
    const getReadingListsFunction = new lambda.Function(this, 'GetReadingListsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');
        
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
            // For now, use temp-user-id (will be replaced with real user ID from Cognito token)
            const userId = 'temp-user-id';
            
            const command = new QueryCommand({
              TableName: process.env.READING_LISTS_TABLE_NAME,
              IndexName: 'userId-index',
              KeyConditionExpression: 'userId = :userId',
              ExpressionAttributeValues: {
                ':userId': userId
              }
            });
            const response = await docClient.send(command);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(response.Items || []),
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
            const now = new Date().toISOString();
            
            const readingList = {
              id: randomUUID(),
              userId: 'temp-user-id', // Will be replaced with real user ID from Cognito
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
            const now = new Date().toISOString();
            
            const command = new UpdateCommand({
              TableName: process.env.READING_LISTS_TABLE_NAME,
              Key: { 
                id: listId,
                userId: 'temp-user-id' // Will be replaced with real user ID
              },
              UpdateExpression: 'SET #name = :name, description = :description, bookIds = :bookIds, updatedAt = :updatedAt',
              ExpressionAttributeNames: {
                '#name': 'name'
              },
              ExpressionAttributeValues: {
                ':name': body.name,
                ':description': body.description || '',
                ':bookIds': body.bookIds || [],
                ':updatedAt': now
              },
              ReturnValues: 'ALL_NEW'
            });
            
            const response = await docClient.send(command);
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(response.Attributes),
            };
          } catch (error) {
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Failed to update reading list' }),
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
