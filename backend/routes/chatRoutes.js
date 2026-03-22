const express = require('express');
const router = express.Router();

const { connectToDatabase, generateResponse, chatHistoryService } = require('../db/database');
const RetrievalService = require('../services/retrievalService');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// Chat endpoint (protected)
router.post('/chat', ensureAuthenticated, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Connect to database
    const db = await connectToDatabase();

    // Retrieve relevant blog posts using RetrievalService
    // Using a similarity threshold of 0.3 for text-embedding-3-large model
    const retrievalService = new RetrievalService(db);
    const relevantBlogs = await retrievalService.retrieveRelevantBlogs(message, 5, 0.3);

    // Format context for OpenAI API
    const context = relevantBlogs.map(blog =>
      `Title: ${blog.title}\nContent: ${blog.body}\nCreated: ${blog.createdAt}`
    ).join('\n\n---\n\n');

    // Generate response using OpenAI
    const response = await generateResponse(context, message);

    // Save message + response to chat history (non-blocking)
    const userId = req.session.user._id;
    await chatHistoryService.saveMessage(userId, message, response);

    // Return both response and sources
    // Only send the most relevant source (the one with highest score)
    // If no relevant blogs found, provide empty sources array
    const mostRelevantSource = relevantBlogs.length > 0 ?
      [relevantBlogs[0]] :
      [];
    res.json({ response, sources: mostRelevantSource });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat history for the logged-in user (protected)
router.get('/chat/history', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const history = await chatHistoryService.getHistory(userId);
    res.json({ history });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear chat history for the logged-in user (protected)
router.delete('/chat/history', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    await chatHistoryService.deleteHistory(userId);
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
