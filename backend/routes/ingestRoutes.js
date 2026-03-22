const express = require('express');
const router = express.Router();

const { connectToDatabase, ingestBlogPosts } = require('../db/database');

// Ingest blog posts endpoint
router.post('/ingest', async (req, res) => {
  try {
    const db = await connectToDatabase();
    await ingestBlogPosts(db);
    res.json({ message: 'Blog post ingestion completed successfully' });
  } catch (error) {
    console.error('Error in ingestion endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
