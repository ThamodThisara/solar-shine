import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';

async function testSpecializedAreas() {
  try {
    console.log('Testing specialized areas collection...');
    console.log('Database ID:', DATABASE_ID);
    console.log('Collection ID:', COLLECTIONS.SPECIALIZED_AREAS);
    
    // Try to list documents
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SPECIALIZED_AREAS);
    console.log('Success! Found', response.documents.length, 'documents');
    console.log('Documents:', response.documents);
    
  } catch (error) {
    console.error('Error testing specialized areas:', error);
    
    // Check if collection exists
    try {
      const collections = await databases.listCollections(DATABASE_ID);
      console.log('Available collections:', collections.collections.map(c => ({ id: c.$id, name: c.name })));
    } catch (colError) {
      console.error('Error listing collections:', colError);
    }
  }
}

testSpecializedAreas();
