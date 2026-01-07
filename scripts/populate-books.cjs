const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const books = [
  {
    id: '1',
    title: 'The Midnight Library',
    author: 'Matt Haig',
    genre: 'Fiction',
    description:
      'Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived.',
    coverImage: '/book-covers/midnight-library.jpg',
    rating: 4.5,
    publishedYear: 2020,
    isbn: '978-0525559474',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    genre: 'Science Fiction',
    description:
      'A lone astronaut must save the earth from disaster in this incredible new science-based thriller from the author of The Martian.',
    coverImage: '/book-covers/project-hail-mary.jpg',
    rating: 4.8,
    publishedYear: 2021,
    isbn: '978-0593135204',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'The Silent Patient',
    author: 'Alex Michaelides',
    genre: 'Mystery',
    description:
      "Alicia Berenson's life is seemingly perfect. A famous painter married to an in-demand fashion photographer, she lives in a grand house. One evening her husband returns home late, and Alicia shoots him five times in the face, and then never speaks another word.",
    coverImage: '/book-covers/silent-patient.jpg',
    rating: 4.3,
    publishedYear: 2019,
    isbn: '978-1250301697',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'People We Meet on Vacation',
    author: 'Emily Henry',
    genre: 'Romance',
    description: 'Two best friends. Ten summer trips. One last chance to fall in love.',
    coverImage: '/book-covers/people-we-meet.jpg',
    rating: 4.2,
    publishedYear: 2021,
    isbn: '978-1984806758',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'Atomic Habits',
    author: 'James Clear',
    genre: 'Non-Fiction',
    description:
      'An Easy & Proven Way to Build Good Habits & Break Bad Ones. Tiny changes, remarkable results.',
    coverImage: '/book-covers/atomic-habits.jpg',
    rating: 4.7,
    publishedYear: 2018,
    isbn: '978-0735211292',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function populateBooks() {
  try {
    const putRequests = books.map((book) => ({
      PutRequest: {
        Item: book,
      },
    }));

    const command = new BatchWriteCommand({
      RequestItems: {
        'MyLibrary-Books': putRequests,
      },
    });

    const result = await docClient.send(command);
    console.log('✅ Books added successfully!', result);

    // Verify by scanning the table
    const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: 'MyLibrary-Books',
      })
    );

    console.log(`📚 Total books in database: ${scanResult.Count}`);
  } catch (error) {
    console.error('❌ Error adding books:', error);
  }
}

populateBooks();
