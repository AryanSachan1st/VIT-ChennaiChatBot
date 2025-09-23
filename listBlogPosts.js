const { MongoClient } = require('mongodb');
require('dotenv').config();

async function listBlogPosts() {
  try {
    // Connect to MongoDB
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    console.log('Connected to MongoDB');
    
    const db = mongoClient.db('blog');
    const postsCollection = db.collection('posts');
    
    // List all blog posts
    const blogPosts = await postsCollection.find({}).toArray();
    
    console.log(`Found ${blogPosts.length} blog posts:`);
    blogPosts.forEach((post, index) => {
      console.log(`${index + 1}. Title: "${post.title}"`);
      console.log(`   Source: ${post.source || 'No source URL'}`);
      console.log(`   Has embedding: ${!!post.embedding}`);
      if (post.embedding) {
        console.log(`   Embedding dimensions: ${post.embedding.length}`);
      }
      console.log('');
    });
    
    // Close connection
    await mongoClient.close();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error listing blog posts:', error);
  }
}

listBlogPosts();
