import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'eu-north-1' });

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

    console.log(`Processing recommendation request for user ${userId}: "${userQuery}"`);

    const prompt = `You are a helpful librarian AI. A user is looking for book recommendations.

User query: "${userQuery}"

Based on this query, recommend 3 books with:
1. Book title and author
2. Brief reason why it matches their interest (max 50 words)
3. Confidence score (0-1)

Respond in JSON format:
{
  "recommendations": [
    {
      "title": "Book Title",
      "author": "Author Name", 
      "reason": "Why this book matches their interest",
      "confidence": 0.95
    }
  ]
}

Make sure the response is valid JSON and includes exactly 3 recommendations.`;

    const command = new InvokeModelCommand({
      modelId: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0', // Claude 3.7 Sonnet Inference Profile
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    console.log('Calling Bedrock with Claude 3.7 Sonnet...');
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

    // Validate recommendations structure
    if (!recommendations.recommendations || !Array.isArray(recommendations.recommendations)) {
      throw new Error('Invalid recommendations format from AI');
    }

    // Ensure we have exactly 3 recommendations
    recommendations.recommendations = recommendations.recommendations.slice(0, 3);

    console.log(`Successfully generated ${recommendations.recommendations.length} recommendations`);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(recommendations),
    };
  } catch (error) {
    console.error('Error getting recommendations:', error);

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
