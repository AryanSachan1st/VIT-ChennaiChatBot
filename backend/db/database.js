const { MongoClient } = require('mongodb');
const OpenAI = require('openai');

const EmbeddingService = require('../services/embeddingService');
const RetrievalService = require('../services/retrievalService');
const AuthService = require('../services/authService');
const ChatHistoryService = require('../services/chatHistoryService');

// MongoDB connection
const mongoClient = new MongoClient(process.env.MONGODB_URI);

// OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ChatHistoryService instance (shared across routes)
const chatHistoryService = new ChatHistoryService(mongoClient);

// AuthService instance (shared across routes) — receives chatHistoryService for cascade delete
const authService = new AuthService(mongoClient, chatHistoryService);

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoClient.connect();
    console.log('Connected to MongoDB');
    return mongoClient.db('test'); // Connect to the 'test' database
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

// Watch for changes in the posts collection and generate embeddings for new posts
async function watchPostsCollection(db) {
  try {
    const postsCollection = db.collection('posts');
    const changeStream = postsCollection.watch();

    changeStream.on('change', async (change) => {
      if (change.operationType === 'insert') {
        console.log('New post detected:', change.fullDocument.title);
        try {
          const embeddingService = new EmbeddingService();
          const post = change.fullDocument;

          // Generate embedding for the new post
          const embeddedPost = await embeddingService.embedBlogPost(post);

          // Update the post in the database with its embedding
          await postsCollection.updateOne(
            { _id: post._id },
            { $set: { embedding: embeddedPost.embedding } }
          );

          console.log(`Successfully embedded new post: ${post.title}`);
        } catch (error) {
          console.error(`Error embedding new post ${change.fullDocument.title}:`, error);
        }
      }
    });

    changeStream.on('error', (error) => {
      console.error('Change stream error:', error);
    });

    console.log('Watching for changes in posts collection...');
  } catch (error) {
    console.error('Error setting up change stream:', error);
  }
}

// Ingestion pipeline: Convert blog posts to embeddings and store in MongoDB
async function ingestBlogPosts(db) {
  try {
    const embeddingService = new EmbeddingService();
    const postsCollection = db.collection('posts');

    // Fetch all blog posts
    const blogPosts = await postsCollection.find({}).toArray();

    console.log(`Found ${blogPosts.length} blog posts in total`);

    let reembeddedCount = 0;
    let newEmbeddingCount = 0;

    // Process each blog post
    for (const post of blogPosts) {
      try {
        // Check if post already has a valid embedding from text-embedding-3-small model
        // If so, or if it doesn't have a valid embedding from text-embedding-3-large model, re-embed it
        if (!embeddingService.hasValidEmbedding(post)) {
          // Generate embedding for the post
          const embeddedPost = await embeddingService.embedBlogPost(post);

          // Update the post in the database with its embedding
          await postsCollection.updateOne(
            { _id: post._id },
            { $set: { embedding: embeddedPost.embedding } }
          );

          newEmbeddingCount++;
          console.log(`Successfully embedded post: ${post.title}`);
        } else {
          // Post has an embedding, but we need to check if it's from the old model
          // The old model produces 1536-dimensional embeddings, the new one produces 3072-dimensional embeddings
          if (post.embedding.length === 1536) {
            // Re-embed with the new model
            const embeddedPost = await embeddingService.embedBlogPost(post);

            // Update the post in the database with its new embedding
            await postsCollection.updateOne(
              { _id: post._id },
              { $set: { embedding: embeddedPost.embedding } }
            );

            reembeddedCount++;
            console.log(`Successfully re-embedded post with new model: ${post.title}`);
          } else {
            // Post already has a valid embedding from the new model, skip it
            console.log(`Skipping post with existing embedding: ${post.title}`);
          }
        }
      } catch (error) {
        console.error(`Error embedding post ${post.title}:`, error);
      }
    }

    console.log(`Blog post ingestion complete. ${newEmbeddingCount} posts embedded, ${reembeddedCount} posts re-embedded for consistency.`);
  } catch (error) {
    console.error('Error in ingestion pipeline:', error);
  }
}

// Generate response using OpenAI API
async function generateResponse(context, message) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for VIT Chennai. You should answer questions based on the provided context from blog posts. If the context contains information about the cultural fest, provide detailed and helpful information about it. If the context doesn't contain relevant information to answer the question, politely inform the user that you don't have information about that topic in the blog posts and suggest them to visit https://chennai.vit.ac.in/ for more information. However, if the user is asking about places to visit near VIT Chennai, you can provide general information about popular nearby locations even if not found in the blog posts.

Keep your answers concise and helpful. VIT Chennai hosts two major annual events: Vibrance (cultural fest) and TechnoVIT (technical fest).

Some popular places to visit near VIT Chennai include:
1. Mahabalipuram (Mamallapuram) - A UNESCO World Heritage site known for its ancient temples and rock carvings, about 60km south of Chennai
2. Chennai Marina Beach - One of the longest urban beaches in the world, located in the city center
3. Kapaleeshwarar Temple - An ancient temple dedicated to Lord Shiva in Mylapore
4. Government Museum Chennai - One of the oldest museums in India with a rich collection of artifacts
5. Elliot's Beach (Besant Nagar Beach) - A clean and popular beach in the southern part of Chennai
6. Guindy National Park - A small protected area within the city limits with wildlife and historical structures
7. Vadapalani Murugan Temple - A famous temple dedicated to Lord Murugan
8. Chennai Central Railway Station - A major transportation hub
9. T Nagar - A popular shopping and commercial area
10. Anna University - A well-known technical university in Chennai

VIT Chennai provides hostel facilities for students. For detailed information about hostels, including accommodation options, amenities, and fees, please visit the official VIT Chennai website at https://chennai.vit.ac.in/ or contact the university directly.

These places are generally accessible by public transport or taxi from VIT Chennai.`
        },
        {
          role: "user",
          content: `Context: ${context}\n\nQuestion: ${message}`
        }
      ]
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}

module.exports = {
  mongoClient,
  openai,
  authService,
  chatHistoryService,
  connectToDatabase,
  watchPostsCollection,
  ingestBlogPosts,
  generateResponse,
};
