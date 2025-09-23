const { MongoClient } = require('mongodb');
const EmbeddingService = require('./services/embeddingService');
require('dotenv').config();

async function testVectorSearch() {
  try {
    // Connect to MongoDB
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    console.log('Connected to MongoDB');
    
    const db = mongoClient.db('blog');
    const postsCollection = db.collection('posts');
    
    // Generate embedding for the query
    const embeddingService = new EmbeddingService();
    const queryEmbedding = await embeddingService.generateEmbedding('vit chennai hostels');
    console.log('Generated query embedding');
    
    // Perform vector search with different parameters to see all results
    const pipeline = [
      {
        "$vectorSearch": {
          "index": "vector_index_1",
          "path": "embedding",
          "queryVector": queryEmbedding,
          "numCandidates": 200,
          "limit": 10
        }
      },
      {
        "$project": {
          "_id": 1,
          "title": 1,
          "body": 1,
          "source": 1,
          "createdAt": 1,
          "updatedAt": 1,
          "score": { "$meta": "vectorSearchScore" }
        }
      }
    ];
    
    const results = await postsCollection.aggregate(pipeline).toArray();
    console.log(`Found ${results.length} blog posts with vector search:`);
    
    results.forEach((post, index) => {
      console.log(`${index + 1}. Title: "${post.title}"`);
      console.log(`   Score: ${post.score}`);
      console.log(`   Source: ${post.source || 'No source URL'}`);
      console.log('');
    });
    
    // Close connection
    await mongoClient.close();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error testing vector search:', error);
  }
}

testVectorSearch();
