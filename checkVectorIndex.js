const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkVectorIndex() {
  try {
    // Connect to MongoDB
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    console.log('Connected to MongoDB');
    
    const db = mongoClient.db('blog');
    const postsCollection = db.collection('posts');
    
    // Try to get index information
    const indexes = await postsCollection.indexes();
    console.log('All indexes:');
    console.log(JSON.stringify(indexes, null, 2));
    
    // Look for vector search index specifically
    const vectorIndex = indexes.find(index => index.name === 'vector_index_1');
    if (vectorIndex) {
      console.log('Found vector_index_1:');
      console.log(JSON.stringify(vectorIndex, null, 2));
    } else {
      console.log('Vector search index not found');
    }
    
    // Close connection
    await mongoClient.close();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error checking vector index:', error);
  }
}

checkVectorIndex();
