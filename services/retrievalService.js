const EmbeddingService = require('./embeddingService');

class RetrievalService {
  constructor(db) {
    this.db = db;
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Retrieve relevant blog posts based on user query using MongoDB Atlas Vector Search
   * @param {string} query - The user's query
   * @param {number} limit - The number of posts to retrieve (default: 5)
   * @param {number} similarityThreshold - The minimum similarity score for posts (default: 0.65)
   * @returns {Promise<Array>} - Array of relevant blog posts
   */
  async retrieveRelevantBlogs(query, limit = 5, similarityThreshold = 0.3) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      
      // Use MongoDB Atlas Vector Search to find similar posts
      const postsCollection = this.db.collection('posts');
      
      const pipeline = [
        {
          "$vectorSearch": {
            "index": "vector_index_1",
            "path": "embedding",
            "queryVector": queryEmbedding,
            "numCandidates": 200,
            "limit": limit
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
        },
        {
          "$match": {
            "score": { "$gte": similarityThreshold }  // Only return results with similarity score >= threshold
          }
        }
      ];
      
      const relevantBlogs = await postsCollection.aggregate(pipeline).toArray();
      return relevantBlogs;
    } catch (error) {
      console.error('Error retrieving blogs:', error);
      throw error;
    }
  }
}

module.exports = RetrievalService;
