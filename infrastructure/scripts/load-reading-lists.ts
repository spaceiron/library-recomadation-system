import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({ region: 'eu-north-1' });
const docClient = DynamoDBDocumentClient.from(client);

const readingLists = [
  {
    id: randomUUID(),
    userId: '1',
    name: 'My Favorites',
    description: 'Books I absolutely love and recommend to everyone',
    bookIds: ['1', '3', '9'], // Atomic Habits, Sapiens, Becoming
    createdAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    userId: '1',
    name: 'To Read Next',
    description: 'Books on my reading list for this year',
    bookIds: ['2', '8', '10'], // The Great Gatsby, Dune, The Alchemist
    createdAt: new Date().toISOString(),
  },
  {
    id: randomUUID(),
    userId: '2',
    name: 'Programming Books',
    description: 'Essential books for software developers',
    bookIds: ['11', '7'], // Clean Code, Lean Startup
    createdAt: new Date().toISOString(),
  },
];

async function loadReadingLists() {
  try {
    const putRequests = readingLists.map((readingList) => ({
      PutRequest: {
        Item: readingList,
      },
    }));

    const command = new BatchWriteCommand({
      RequestItems: {
        ReadingLists: putRequests,
      },
    });

    const result = await docClient.send(command);
    console.log(`Loaded ${readingLists.length} reading lists`);

    if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
      console.warn('Some items were not processed:', result.UnprocessedItems);
    }

    console.log('Successfully loaded reading lists into DynamoDB');
    readingLists.forEach((list, index) => {
      console.log(
        `${index + 1}. "${list.name}" (User ${list.userId}) - ${list.bookIds.length} books`
      );
    });
  } catch (error) {
    console.error('Error loading reading lists:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  loadReadingLists();
}
