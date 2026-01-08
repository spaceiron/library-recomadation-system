import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

interface RecommendationRequest {
  query: string;
}

interface Recommendation {
  title: string;
  author: string;
  reason: string;
  confidence: number;
}

function getUserIdFromEvent(event: APIGatewayProxyEvent): string {
  const claims = event.requestContext.authorizer?.claims;
  if (claims) {
    return claims.sub || claims['cognito:username'];
  }
  return 'anonymous';
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
    const body: RecommendationRequest = JSON.parse(event.body || '{}');
    const userId = getUserIdFromEvent(event);
    const userQuery = body.query;

    if (!userQuery || userQuery.trim().length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Query is required' }),
      };
    }

    // Add query length validation for cost optimization
    if (userQuery.length > 1000) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Query too long',
          details: 'Query must be 1000 characters or less',
          maxLength: 1000,
        }),
      };
    }

    console.log(
      `Processing recommendation request for user ${userId}: "${userQuery.substring(0, 100)}${userQuery.length > 100 ? '...' : ''}"`
    );

    const startTime = Date.now();

    // First, get available books from the library
    const booksResponse = await fetch(`${process.env.API_BASE_URL}/getBooks`);
    const booksData: any = await booksResponse.json();
    const availableBooks = booksData.response?.Items || [];

    console.log(`Found ${availableBooks.length} books in library`);

    const booksList = availableBooks
      .map((book: any) => `"${book.title}" by ${book.author} (${book.genre})`)
      .join('\n');

    const prompt = `You are a librarian AI. Based on the user query: "${userQuery}"

AVAILABLE BOOKS IN OUR LIBRARY:
${booksList}

Task: Recommend ONLY books that exist in our library above. If no relevant books exist, return an empty recommendations array.

Format as JSON:
{
  "recommendations": [
    {
      "title": "Exact title from library",
      "author": "Exact author from library", 
      "reason": "Why this book matches the query (max 40 words)",
      "confidence": 0.95
    }
  ]
}

IMPORTANT: Only recommend books that are actually in our library list above. If no relevant books exist, return {"recommendations": []}.`;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0', // Claude 3 Haiku for cost optimization
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000, // Reduced from 1500 for cost optimization
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    console.log('Calling Bedrock with Claude 3 Haiku...');
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const aiResponse = responseBody.content[0].text;

    console.log('Raw AI Response:', aiResponse);

    // Parse AI response - Claude sometimes wraps JSON in markdown code blocks
    let recommendations: { recommendations: Recommendation[] };
    try {
      // Try to extract JSON from markdown code blocks if present
      let jsonText = aiResponse;
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // Look for JSON object in the response
        const jsonObjectMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonText = jsonObjectMatch[0];
        }
      }

      console.log('Extracted JSON text:', jsonText);
      recommendations = JSON.parse(jsonText);

      // Validate the structure
      if (!recommendations.recommendations || !Array.isArray(recommendations.recommendations)) {
        throw new Error('Invalid recommendations structure');
      }

      console.log('Successfully parsed recommendations:', recommendations);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw AI response was:', aiResponse);

      // Return error instead of fallback to see what's happening
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: 'Failed to parse AI response',
          details: `Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          rawResponse: aiResponse.substring(0, 500), // First 500 chars for debugging
        }),
      };
    }

    // Validate recommendations structure and content
    if (!recommendations.recommendations || !Array.isArray(recommendations.recommendations)) {
      throw new Error('Invalid recommendations format from AI');
    }

    // Handle empty recommendations (no relevant books found)
    if (recommendations.recommendations.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          recommendations: [],
          message:
            'No relevant books found in our library for your query. Try a different search term or browse our available books.',
        }),
      };
    }

    // Validate each recommendation has required fields and proper types
    for (let i = 0; i < recommendations.recommendations.length; i++) {
      const rec = recommendations.recommendations[i];
      if (!rec.title || typeof rec.title !== 'string') {
        throw new Error(`Recommendation ${i + 1} missing or invalid title`);
      }
      if (!rec.author || typeof rec.author !== 'string') {
        throw new Error(`Recommendation ${i + 1} missing or invalid author`);
      }
      if (!rec.reason || typeof rec.reason !== 'string') {
        throw new Error(`Recommendation ${i + 1} missing or invalid reason`);
      }
      if (typeof rec.confidence !== 'number' || rec.confidence < 0 || rec.confidence > 1) {
        // Clamp confidence to valid range
        rec.confidence = Math.max(0, Math.min(1, rec.confidence || 0.5));
      }
    }

    // Ensure we have exactly 3 recommendations
    recommendations.recommendations = recommendations.recommendations.slice(0, 3);

    console.log(`Successfully generated ${recommendations.recommendations.length} recommendations`);

    // Log successful request with performance metrics
    const processingTime = Date.now() - startTime;
    console.log(
      JSON.stringify({
        level: 'INFO',
        message: 'Recommendation request successful',
        userId,
        queryLength: userQuery.length,
        recommendationCount: recommendations.recommendations.length,
        processingTime,
        modelUsed: 'claude-3-haiku',
      })
    );

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(recommendations),
    };
  } catch (error) {
    console.error('Error getting recommendations:', error);

    // Enhanced error logging
    console.error(
      JSON.stringify({
        level: 'ERROR',
        message: 'Recommendation request failed',
        userId: getUserIdFromEvent(event),
        query: event.body ? JSON.parse(event.body).query?.substring(0, 100) : 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
    );

    // Return appropriate error response based on error type
    if (error instanceof Error) {
      if (
        error.message.includes('AccessDenied') ||
        error.message.includes('UnauthorizedOperation')
      ) {
        return {
          statusCode: 403,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: 'Model access denied',
            details: 'Please ensure Bedrock model access is enabled for Claude 3 Haiku',
          }),
        };
      }

      if (
        error.message.includes('ThrottlingException') ||
        error.message.includes('TooManyRequestsException')
      ) {
        return {
          statusCode: 429,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: 'Rate limit exceeded',
            details: 'Please try again in a few moments',
            retryAfter: 60,
          }),
        };
      }
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Failed to get recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
