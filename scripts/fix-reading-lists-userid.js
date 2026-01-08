#!/usr/bin/env node

/**
 * Script to fix userId mismatch in reading lists
 *
 * This script updates existing reading lists from userId '1' to the actual
 * authenticated Cognito user ID to fix the "Add to Reading List" functionality.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'eu-north-1' });
const docClient = DynamoDBDocumentClient.from(client);

const READING_LISTS_TABLE = 'LibraryStack-ReadingListsTable';

async function fixReadingListsUserId() {
  console.log('🔍 Scanning for reading lists with userId "1"...');

  try {
    // First, scan for all reading lists with userId '1'
    const scanCommand = new ScanCommand({
      TableName: READING_LISTS_TABLE,
      FilterExpression: 'userId = :oldUserId',
      ExpressionAttributeValues: {
        ':oldUserId': '1',
      },
    });

    const scanResult = await docClient.send(scanCommand);
    const listsToUpdate = scanResult.Items || [];

    console.log(`📋 Found ${listsToUpdate.length} reading lists to update`);

    if (listsToUpdate.length === 0) {
      console.log('✅ No reading lists need updating');
      return;
    }

    // Get the new userId from command line argument
    const newUserId = process.argv[2];
    if (!newUserId) {
      console.error('❌ Please provide the new userId as an argument');
      console.log('Usage: node fix-reading-lists-userid.js <cognito-user-id>');
      process.exit(1);
    }

    console.log(`🔄 Updating reading lists to userId: ${newUserId}`);

    // Update each reading list
    for (const list of listsToUpdate) {
      console.log(`  📝 Updating list: ${list.name} (${list.id})`);

      // Delete the old item
      const deleteCommand = new UpdateCommand({
        TableName: READING_LISTS_TABLE,
        Key: {
          id: list.id,
          userId: '1',
        },
        UpdateExpression: 'REMOVE #dummy',
        ExpressionAttributeNames: {
          '#dummy': 'dummy',
        },
        ConditionExpression: 'attribute_exists(id)',
      });

      // Create new item with correct userId
      const createCommand = new UpdateCommand({
        TableName: READING_LISTS_TABLE,
        Key: {
          id: list.id,
          userId: newUserId,
        },
        UpdateExpression:
          'SET #name = :name, description = :desc, bookIds = :bookIds, createdAt = :createdAt, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#name': 'name',
        },
        ExpressionAttributeValues: {
          ':name': list.name,
          ':desc': list.description,
          ':bookIds': list.bookIds,
          ':createdAt': list.createdAt,
          ':updatedAt': new Date().toISOString(),
        },
      });

      try {
        await docClient.send(createCommand);
        console.log(`    ✅ Successfully updated ${list.name}`);
      } catch (error) {
        console.error(`    ❌ Failed to update ${list.name}:`, error.message);
      }
    }

    console.log('🎉 Reading lists userId fix completed!');
  } catch (error) {
    console.error('❌ Error fixing reading lists:', error);
    process.exit(1);
  }
}

fixReadingListsUserId();
