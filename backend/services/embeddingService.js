const OpenAI = require('openai');

class EmbeddingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate embeddings for a given text using OpenAI's text-embedding-3-large model
   * @param {string} text - The text to generate embeddings for
   * @returns {Promise<Array<number>>} - The embedding vector
   */
  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text,
        dimensions: 3072, // Explicitly specify dimensions for consistency
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for a blog post
   * @param {Object} blogPost - The blog post object with title and body
   * @returns {Promise<Object>} - Blog post with added embedding
   */
  async embedBlogPost(blogPost) {
    try {
      // Combine title and body for embedding
      const text = `${blogPost.title} ${blogPost.body}`;
      const embedding = await this.generateEmbedding(text);
      
      return {
        ...blogPost,
        embedding: embedding
      };
    } catch (error) {
      console.error('Error embedding blog post:', error);
      throw error;
    }
  }

  /**
   * Check if a blog post has a valid embedding from text-embedding-3-large model
   * @param {Object} blogPost - The blog post object
   * @returns {boolean} - Whether the blog post has a valid 3072-dimensional embedding
   */
  hasValidEmbedding(blogPost) {
    // Check if the blog post has a valid 3072-dimensional embedding (text-embedding-3-large)
    return blogPost.embedding && blogPost.embedding.length === 3072;
  }
}

module.exports = EmbeddingService;
