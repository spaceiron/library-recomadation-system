const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const newBooks = [
  {
    id: '6',
    title: 'The Seven Husbands of Evelyn Hugo',
    author: 'Taylor Jenkins Reid',
    genre: 'Fiction',
    description:
      'Aging and reclusive Hollywood movie icon Evelyn Hugo is finally ready to tell the truth about her glamorous and scandalous life.',
    coverImage: '/book-covers/evelyn-hugo.jpg',
    rating: 4.6,
    publishedYear: 2017,
    isbn: '978-1501161933',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '7',
    title: 'Dune',
    author: 'Frank Herbert',
    genre: 'Science Fiction',
    description:
      'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world.',
    coverImage: '/book-covers/dune.jpg',
    rating: 4.4,
    publishedYear: 1965,
    isbn: '978-0441172719',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '8',
    title: 'The Thursday Murder Club',
    author: 'Richard Osman',
    genre: 'Mystery',
    description:
      'Four unlikely friends meet weekly to investigate unsolved killings. But when a local developer is found dead, these unorthodox detectives find themselves in the middle of their first live case.',
    coverImage: '/book-covers/thursday-murder-club.jpg',
    rating: 4.1,
    publishedYear: 2020,
    isbn: '978-1984880987',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '9',
    title: 'Educated',
    author: 'Tara Westover',
    genre: 'Non-Fiction',
    description:
      'A memoir about a young girl who, kept out of school, leaves her survivalist family and goes on to earn a PhD from Cambridge University.',
    coverImage: '/book-covers/educated.jpg',
    rating: 4.5,
    publishedYear: 2018,
    isbn: '978-0399590504',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '10',
    title: 'The Song of Achilles',
    author: 'Madeline Miller',
    genre: 'Fiction',
    description:
      "A tale of gods, kings, immortal fame and the human heart, The Song of Achilles is a dazzling literary feat that brilliantly reimagines Homer's enduring masterwork, The Iliad.",
    coverImage: '/book-covers/song-of-achilles.jpg',
    rating: 4.6,
    publishedYear: 2011,
    isbn: '978-0062060624',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '11',
    title: 'Where the Crawdads Sing',
    author: 'Delia Owens',
    genre: 'Fiction',
    description:
      'For years, rumors of the "Marsh Girl" have haunted Barkley Cove, a quiet town on the North Carolina coast. So in late 1969, when handsome Chase Andrews is found dead, the locals immediately suspect Kya Clark, the so-called Marsh Girl.',
    coverImage: '/book-covers/crawdads-sing.jpg',
    rating: 4.4,
    publishedYear: 2018,
    isbn: '978-0735219090',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function addMoreBooks() {
  try {
    const putRequests = newBooks.map((book) => ({
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
    console.log('✅ 6 new books added successfully!', result);

    // Verify by scanning the table
    const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: 'MyLibrary-Books',
      })
    );

    console.log(`📚 Total books in database: ${scanResult.Count}`);
    console.log('📖 Book titles:');
    scanResult.Items?.forEach((book) => {
      console.log(`  - ${book.title} by ${book.author}`);
    });
  } catch (error) {
    console.error('❌ Error adding books:', error);
  }
}

addMoreBooks();
