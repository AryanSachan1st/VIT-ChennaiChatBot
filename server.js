const express = require('express');
const { MongoClient } = require('mongodb');
const OpenAI = require('openai');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const EmbeddingService = require('./services/embeddingService');
const RetrievalService = require('./services/retrievalService');

const app = express();
const port = process.env.PORT || 3000;

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_key_for_development',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI,
    dbName: 'blog',
    collectionName: 'sessions'
  }),
  cookie: { 
    secure: false, 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  proxy: true
}));

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

// Middleware
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
const mongoClient = new MongoClient(process.env.MONGODB_URI);

// OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Import AuthService
const AuthService = require('./services/authService');
const authService = new AuthService(mongoClient);

// Passport serialization and deserialization
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser(async (user, done) => {
  done(null, user);
});

// Google OAuth Strategy (only if environment variables are set)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI) {
  passport.use('google-login', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // For login, only allow existing users
      const db = await connectToDatabase();
      const usersCollection = db.collection('users');
      const existingUser = await usersCollection.findOne({ 
        $or: [{ email: profile.emails[0].value }, { googleId: profile.id }] 
      });
      
      if (existingUser) {
        // If user exists but doesn't have googleId, update it
        if (!existingUser.googleId) {
          await usersCollection.updateOne(
            { email: profile.emails[0].value },
            { $set: { googleId: profile.id } }
          );
        }
        // Return user without password
        const { password: _, ...userWithoutPassword } = existingUser;
        return done(null, userWithoutPassword);
      }
      
      // If user doesn't exist, don't create account for login
      return done(null, false, { message: 'No user found with this email. Please signup first.' });
    } catch (error) {
      return done(error, null);
    }
  }));

  passport.use('google-signup', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // For signup, create new user if doesn't exist
      const result = await authService.registerGoogleUser(profile);
      
      if (result.success) {
        return done(null, result.user);
      } else {
        return done(null, false, { message: result.message });
      }
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoClient.connect();
    console.log('Connected to MongoDB');
    return mongoClient.db('blog'); // Connect to the 'blog' database
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

// Retrieve relevant blog posts based on user query
async function retrieveRelevantBlogs(db, query) {
  try {
    const retrievalService = new RetrievalService(db);
    const relevantBlogs = await retrievalService.retrieveRelevantBlogs(query, 5);
    
    // Format the context from retrieved blog posts
    return relevantBlogs.map(blog => 
      `Title: ${blog.title}\nContent: ${blog.body}\nCreated: ${blog.createdAt}`
    ).join('\n\n---\n\n');
  } catch (error) {
    console.error('Error retrieving blogs:', error);
    return '';
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

// Ingest blog posts endpoint
app.post('/ingest', async (req, res) => {
  try {
    const db = await connectToDatabase();
    await ingestBlogPosts(db);
    res.json({ message: 'Blog post ingestion completed successfully' });
  } catch (error) {
    console.error('Error in ingestion endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Authentication routes
// Signup route
app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Register user through AuthService
    const result = await authService.registerUser(username, email, password);
    
    if (result.success) {
      // Don't create session for the user yet, they need to verify OTP first
      res.json({ success: true, user: result.user, otpSent: result.otpSent });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error in signup endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OTP verification route
app.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }
    
    // Verify OTP through AuthService
    const result = await authService.verifyOTP(email, otp);
    
    if (result.success) {
      // Create session for the user after successful OTP verification
      req.session.user = result.user;
      res.json({ success: true, user: result.user });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error in OTP verification endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Login user through AuthService
    const result = await authService.loginUser(email, password);
    
    if (result.success) {
      // Check if user is verified
      if (!result.user.isVerified) {
        return res.status(400).json({ error: 'Please verify your email with the OTP sent to your inbox' });
      }
      
      // Create session for the user
      req.session.user = result.user;
      res.json({ success: true, user: result.user });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error in login endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend OTP route
app.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Resend OTP through AuthService
    const result = await authService.resendOTP(email);
    
    if (result.success) {
      res.json({ success: true, message: 'OTP has been resent to your email.' });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error in resend OTP endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Google OAuth routes
app.get('/auth/google/login', passport.authenticate('google-login', { scope: ['profile', 'email'] }));

app.get('/auth/google/signup', passport.authenticate('google-signup', { 
  scope: ['profile', 'email']
}));

// Google OAuth callback route
app.get('/auth/google/callback', passport.authenticate('google-signup', {
  failureRedirect: '/?loginError=Authentication failed.',
  successRedirect: '/chatbot.html'
}));

// Google OAuth signup callback route
app.get('/auth/google/signup/callback', passport.authenticate('google-signup', {
  failureRedirect: '/?signupError=Authentication failed.',
  successRedirect: '/chatbot.html'
}));

// Logout route
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Middleware to check if user is authenticated
function ensureAuthenticated(req, res, next) {
  console.log('Session check:', req.session);
  console.log('Session user:', req.session.user);
  // Check for user authenticated via manual login/signup or Google OAuth
  if (req.session.user || (req.session.passport && req.session.passport.user)) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// Chat endpoint (protected)
app.post('/chat', ensureAuthenticated, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Connect to database
    const db = await connectToDatabase();
    
    // Retrieve relevant blog posts using RetrievalService
    // Using a similarity threshold of 0.65 for text-embedding-3-large model
    const retrievalService = new RetrievalService(db);
    const relevantBlogs = await retrievalService.retrieveRelevantBlogs(message, 5, 0.3);
    
    // Format context for OpenAI API
    const context = relevantBlogs.map(blog => 
      `Title: ${blog.title}\nContent: ${blog.body}\nCreated: ${blog.createdAt}`
    ).join('\n\n---\n\n');
    
    // Generate response using OpenAI
    const response = await generateResponse(context, message);
    
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

// Start server
app.listen(port, async () => {
  console.log(`AI Chatbot server running on http://localhost:${port}`);
  
  // Run ingestion pipeline on startup
  try {
    const db = await connectToDatabase();
    await ingestBlogPosts(db);
    
    // Start watching for changes in posts collection
    await watchPostsCollection(db);
  } catch (error) {
    console.error('Error during startup ingestion:', error);
  }
});
