# VIT Chennai AI Chatbot - Architecture Documentation

## Overview

The VIT Chennai AI Chatbot is a full-stack web application that implements a Retrieval-Augmented Generation (RAG) system to provide intelligent responses to user queries about VIT Chennai's blog posts. The application features user authentication (both manual and Google OAuth), blog post ingestion with vector embeddings, and a chat interface that retrieves relevant information from the database to generate context-aware responses.

## System Architecture

### Backend Architecture

The backend is built with Node.js and Express, following a modular architecture with separate services for different functionalities:

#### Main Server (server.js)
- **Express.js Framework**: Core web server framework handling HTTP requests and responses
- **MongoDB Integration**: Uses MongoDB Atlas for data storage with connection pooling
- **OpenAI API Integration**: Connects to OpenAI's GPT models for generating responses
- **Authentication Middleware**: Implements session-based authentication with Passport.js
- **Route Management**: Defines all API endpoints for authentication, ingestion, and chat functionality
- **Database Watcher**: Implements change streams to automatically generate embeddings for new blog posts

#### Services Layer

##### AuthService (services/authService.js)
- **User Registration**: Handles manual user signup with bcrypt password hashing
- **Email Verification**: Implements OTP (One-Time Password) verification system using Nodemailer
- **User Login**: Manages user authentication with secure password comparison
- **Google OAuth Integration**: Supports Google authentication for signup and login
- **Session Management**: Handles user sessions with MongoDB storage

##### EmbeddingService (services/embeddingService.js)
- **OpenAI Embeddings API**: Uses text-embedding-3-large model to generate 3072-dimensional vectors
- **Blog Post Processing**: Combines blog post title and body for embedding generation
- **Embedding Validation**: Checks if existing embeddings are valid (3072 dimensions)

##### RetrievalService (services/retrievalService.js)
- **Vector Search**: Implements MongoDB Atlas Vector Search for finding relevant blog posts
- **Query Processing**: Converts user queries to embeddings for similarity search
- **Result Ranking**: Returns blog posts ranked by similarity score

### Frontend Architecture

The frontend is a client-side rendered application with two main pages:

#### Authentication Page (public/index.html)
- **Tab Interface**: Switches between login and signup forms
- **Manual Authentication Forms**: 
  - Login form with email/password fields
  - Signup form with username/email/password fields
  - OTP verification form for email confirmation
- **Google OAuth Integration**: Buttons for Google login/signup that redirect to OAuth endpoints
- **Responsive Design**: Mobile-friendly layout with appropriate styling

#### Chatbot Page (public/chatbot.html)
- **Chat Interface**: Displays conversation history between user and bot
- **Message Input**: Text input field for user queries with send button
- **Logout Functionality**: Button to terminate user session
- **Source Attribution**: Shows sources for the bot's responses

#### Styling (public/styles.css)
- **Modern UI Design**: Gradient backgrounds, rounded corners, and smooth animations
- **Responsive Layout**: Flexbox-based design that works on different screen sizes
- **Interactive Elements**: Hover effects, transitions, and animations for better UX
- **Consistent Color Scheme**: Uses VIT Chennai's brand colors (#1a2a6c and #b21f1f)

#### Client-Side Logic (public/script.js)
- **Page Detection**: Determines if user is on authentication or chatbot page
- **Form Handling**: Manages form submissions for login, signup, and OTP verification
- **Google OAuth Redirects**: Handles redirects to Google authentication endpoints
- **Chat Functionality**: 
  - Sends user messages to backend
  - Displays bot responses with sources
  - Implements "thinking" indicator during processing
- **Session Management**: Redirects between pages based on authentication status

## Authentication Flow

### Manual Registration
1. User fills signup form (username, email, password)
2. Password is hashed using bcrypt
3. User record is created in MongoDB with `isVerified: false`
4. 6-digit OTP is generated and sent to user's email
5. User must verify OTP within 10 minutes to complete registration

### Manual Login
1. User provides email and password
2. Password is verified against hashed version in database
3. If user is not verified, they are prompted to verify their email
4. Upon successful authentication, session is created

### Google OAuth
1. User clicks Google login/signup button
2. Redirected to Google's OAuth consent screen
3. After authentication, Google profile data is used to:
   - Find existing user by email or Google ID
   - Create new user if none exists
4. Session is established with user data

### Session Management
- Sessions are stored in MongoDB using connect-mongo
- Session secret is used to sign session cookies
- Middleware ensures authenticated access to chat endpoint

## RAG Implementation

### Ingestion Pipeline
1. On server startup, all blog posts are retrieved from MongoDB
2. Posts without valid embeddings are processed:
   - Title and body are combined into a single text
   - Text is sent to OpenAI Embeddings API
   - Generated embedding is stored with the post
3. Change streams monitor for new posts and automatically generate embeddings

### Retrieval Process
1. User query is converted to embedding using OpenAI Embeddings API
2. MongoDB Atlas Vector Search finds similar posts based on cosine similarity
3. Top 5 most relevant posts are retrieved with similarity scores

### Generation Process
1. Retrieved blog posts are formatted as context
2. Context and user query are sent to OpenAI Chat Completions API
3. System prompt instructs the model to:
   - Answer based on provided context
   - Provide detailed information about cultural fest if relevant
   - Direct users to official website for unrelated queries
4. Model response is returned to frontend with source information

## Data Flow

### User Registration
```
Frontend Form → POST /signup → AuthService.registerUser() 
→ Hash Password → Send OTP Email → Store User in MongoDB
```

### OTP Verification
```
Frontend Form → POST /verify-otp → AuthService.verifyOTP()
→ Validate OTP → Update User Verification Status
```

### User Login
```
Frontend Form → POST /login → AuthService.loginUser()
→ Verify Password → Create Session
```

### Chat Query
```
Frontend Input → POST /chat → RetrievalService.retrieveRelevantBlogs()
→ Generate Query Embedding → Vector Search in MongoDB
→ Format Context → OpenAI Chat Completion → Return Response
```

### Blog Post Ingestion
```
Server Startup → ingestBlogPosts() → For Each Post:
→ Check for Valid Embedding → Generate Embedding if Missing
→ Update Post in MongoDB
```

### New Post Detection
```
MongoDB Change Stream → watchPostsCollection()
→ On Insert Event → Generate Embedding → Update Post
```

## Technologies Used

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database with Atlas Vector Search
- **OpenAI API**: For embeddings and chat completions
- **Passport.js**: Authentication middleware
- **bcryptjs**: Password hashing
- **nodemailer**: Email sending for OTP verification
- **dotenv**: Environment variable management

### Frontend
- **HTML5**: Markup language
- **CSS3**: Styling with modern features (flexbox, gradients, animations)
- **Vanilla JavaScript**: Client-side logic without frameworks
- **Fetch API**: HTTP requests to backend

## Deployment Considerations

### Environment Variables
The application requires several environment variables stored in a `.env` file:
- MongoDB connection URI
- OpenAI API key
- Session secret
- Google OAuth credentials
- Email service configuration

### Database Requirements
- MongoDB Atlas cluster with Vector Search enabled
- Vector search index configured on the `posts` collection
- Database named `blog` with `posts` and `users` collections

### Vector Search Index Configuration
The vector search index should be configured with:
- Path: `embedding`
- Type: `vector`
- Dimensions: `3072` (for text-embedding-3-large model)

### Security Considerations
- Passwords are hashed before storage
- Sessions are signed with secret key
- HTTPS should be used in production
- Environment variables should not be exposed in client-side code
- Rate limiting should be implemented for API endpoints

### Scalability
- The application can be scaled horizontally by adding more server instances
- MongoDB Atlas provides automatic scaling capabilities
- Change streams work across replica sets
- Session storage in MongoDB allows for shared session state across instances

## Testing

The application includes a test script (`testAuth.js`) that verifies:
- Unauthorized access to chat endpoint
- User registration flow
- User login flow
- Authenticated access to chat endpoint
- Session cookie handling

## Future Improvements

1. **Rate Limiting**: Implement rate limiting for API endpoints to prevent abuse
2. **Input Validation**: Add more comprehensive input validation and sanitization
3. **Error Handling**: Improve error handling with more specific error messages
4. **UI Enhancements**: Add loading states and better error display in the frontend
5. **Caching**: Implement caching for embeddings to reduce API calls
6. **Admin Interface**: Add admin functionality for managing blog posts
7. **Analytics**: Add usage analytics to track user interactions
