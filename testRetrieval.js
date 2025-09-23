const { MongoClient } = require('mongodb');
const RetrievalService = require('./services/retrievalService');
require('dotenv').config();

async function testRetrieval() {
  try {
    // Connect to MongoDB
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    console.log('Connected to MongoDB');
    
    const db = mongoClient.db('blog');
    
    // Test retrieval with hostel query at different thresholds
    console.log('Testing retrieval with hostel query at different thresholds');
    
    const thresholds = [0.65, 0.5, 0.3, 0.1];
    for (const threshold of thresholds) {
      console.log(`\nTrying threshold: ${threshold}`);
      const retrievalService = new RetrievalService(db);
      const relevantBlogs = await retrievalService.retrieveRelevantBlogs('vit chennai hostels', 5, threshold);
      
      console.log(`Found ${relevantBlogs.length} relevant blog posts`);
      
      if (relevantBlogs.length > 0) {
        console.log('Most relevant post:');
        console.log(`  Title: ${relevantBlogs[0].title}`);
        console.log(`  Score: ${relevantBlogs[0].score}`);
        console.log(`  Source: ${relevantBlogs[0].source}`);
      }
    }
    
    // Also test with a more specific query
    console.log('\n\nTesting with more specific query: "VIT Chennai Hostel Facilities"');
    const retrievalService = new RetrievalService(db);
    const relevantBlogs = await retrievalService.retrieveRelevantBlogs('VIT Chennai Hostel Facilities', 5, 0.65);
    
    console.log(`Found ${relevantBlogs.length} relevant blog posts`);
    
    if (relevantBlogs.length > 0) {
      console.log('Most relevant post:');
      console.log(`  Title: ${relevantBlogs[0].title}`);
      console.log(`  Score: ${relevantBlogs[0].score}`);
      console.log(`  Source: ${relevantBlogs[0].source}`);
    }
    
    // Close connection
    await mongoClient.close();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error testing retrieval:', error);
  }
}

testRetrieval();
