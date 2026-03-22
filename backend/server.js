const path = require('path');

// Load .env from the project root (one level above backend/)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Database layer (mongoClient, openai, authService, and DB functions)
const {
  mongoClient,
  authService,
  connectToDatabase,
  ingestBlogPosts,
  watchPostsCollection,
} = require('./db/database');

// Route modules
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const ingestRoutes = require('./routes/ingestRoutes');
const oauthRoutes = require('./routes/oauthRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_key_for_development',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    dbName: 'test',
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

// Serve the frontend static files from the ../frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

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
      console.log('Google login strategy initiated for user:', profile.emails[0].value);
      // For login, only allow existing users
      const db = await connectToDatabase();
      const usersCollection = db.collection('users');
      const existingUser = await usersCollection.findOne({
        $or: [{ email: profile.emails[0].value }, { googleId: profile.id }]
      });

      if (existingUser) {
        console.log('Existing user found for Google login:', existingUser.email);
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

      console.log('No existing user found for Google login:', profile.emails[0].value);
      // If user doesn't exist, don't create account for login
      return done(null, false, { message: 'No user found with this email. Please signup first.' });
    } catch (error) {
      console.error('Error in Google login strategy:', error);
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
      console.log('Google signup strategy initiated for user:', profile.emails[0].value);
      // For signup, create new user if doesn't exist
      const result = await authService.registerGoogleUser(profile);
      console.log('Google signup result:', result);

      if (result.success) {
        console.log('Google signup successful for user:', result.user.email);
        return done(null, result.user);
      } else {
        console.log('Google signup failed for user:', profile.emails[0].value, 'with message:', result.message);
        return done(null, false, { message: result.message });
      }
    } catch (error) {
      console.error('Error in Google signup strategy:', error);
      return done(error, null);
    }
  }));
}

// Register all route modules
app.use('/', authRoutes);
app.use('/', chatRoutes);
app.use('/', ingestRoutes);
app.use('/', oauthRoutes);

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
