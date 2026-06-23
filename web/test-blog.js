// Test script to verify Appwrite blog functionality
import { Client, Databases, Storage, ID } from 'node-appwrite';

const endpoint = 'http://localhost/v1'; // or your Appwrite endpoint
const projectId = '685bcfb7001103824569';
const databaseId = '6873ba790033a7d5cfdb';
const collectionId = 'blog_posts';
const storageBucketId = 'media';

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

const databases = new Databases(client);
const storage = new Storage(client);

async function testBlogConnection() {
  try {
    console.log('Testing Appwrite connection...');
    
    // Test database connection
    const database = await databases.get(databaseId);
    console.log('✅ Database connected:', database.name);
    
    // Test collection access
    const collection = await databases.getCollection(databaseId, collectionId);
    console.log('✅ Collection accessed:', collection.name);
    
    // Test creating a simple blog post
    const testPost = {
      title: 'Test Blog Post',
      slug: 'test-blog-post',
      excerpt: 'This is a test blog post',
      content: 'Test content for the blog post',
      author: 'Test Author',
      publishDate: new Date().toISOString(),
      categories: ['test'],
      tags: ['test']
    };
    
    console.log('Creating test blog post...');
    const createdPost = await databases.createDocument(
      databaseId, 
      collectionId, 
      ID.unique(), 
      testPost
    );
    
    console.log('✅ Blog post created successfully:', createdPost.$id);
    
    // Test fetching the post
    const fetchedPost = await databases.getDocument(
      databaseId, 
      collectionId, 
      createdPost.$id
    );
    
    console.log('✅ Blog post fetched successfully:', fetchedPost.title);
    
    // Clean up - delete the test post
    await databases.deleteDocument(
      databaseId, 
      collectionId, 
      createdPost.$id
    );
    
    console.log('✅ Test blog post deleted');
    console.log('🎉 All tests passed! Blog functionality is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response
    });
  }
}

testBlogConnection();
