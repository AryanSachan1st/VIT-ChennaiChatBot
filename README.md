# VIT Chennai AI Chatbot

A simple AI chatbot application with Retrieval-Augmented Generation (RAG) functionality for VIT Chennai's blog posts.

## Features

- User authentication (manual signup/login and Google OAuth)
- Blog post ingestion with vector embeddings
- Intelligent chat responses based on VIT Chennai blog content
- Session management
- Email verification for manual registration

## Technologies Used

### Backend
- Node.js
- Express.js
- MongoDB Atlas with Vector Search
- OpenAI API (for embeddings and chat completions)
- Passport.js (for authentication)
- bcryptjs (for password hashing)
- nodemailer (for email sending)
- dotenv (for environment variable management)

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   - `MONGODB_URI` - Your MongoDB Atlas connection URI
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `JWT_SECRET` - A secret key for JWT tokens
   - `SESSION_SECRET` - A secret key for session management
   - `GOOGLE_CLIENT_ID` - Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
   - `GOOGLE_REDIRECT_URI` - Google OAuth redirect URI
   - `EMAIL_HOST` - SMTP email host
   - `EMAIL_PORT` - SMTP email port
   - `EMAIL_SECURE` - Whether to use secure connection
   - `EMAIL_USER` - Email account username
   - `EMAIL_PASS` - Email account password

4. Run the application:
   ```
   npm start
   ```
   or for development:
   ```
   npm run dev
   ```

## Architecture

For detailed information about the system architecture, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Testing

The application includes test scripts to verify functionality:
- `testAuth.js` - Tests authentication flows
- `testRetrieval.js` - Tests blog post retrieval
- `testVectorSearch.js` - Tests vector search functionality
- `testChat.js` - Tests chat functionality
- `checkVectorIndex.js` - Checks vector index configuration
- `listBlogPosts.js` - Lists blog posts in the database
