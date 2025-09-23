const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');

class AuthService {
  constructor(mongoClient) {
    this.mongoClient = mongoClient;
    this.dbName = 'blog';
    
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async connectToDatabase() {
    try {
      await this.mongoClient.connect();
      return this.mongoClient.db(this.dbName);
    } catch (error) {
      console.error('Error connecting to MongoDB in AuthService:', error);
      throw error;
    }
  }

  // Generate a random 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP via email
  async sendOTP(email, otp) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'VIT Chennai Chatbot - OTP Verification',
        text: `Your OTP for registration is: ${otp}\n\nPlease enter this OTP to complete your registration.`,
        html: `
          <h2>VIT Chennai Chatbot - OTP Verification</h2>
          <p>Your OTP for registration is: <strong>${otp}</strong></p>
          <p>Please enter this OTP to complete your registration.</p>
          <p>This OTP will expire in 10 minutes.</p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('OTP sent successfully to', email);
      return true;
    } catch (error) {
      console.error('Error sending OTP:', error);
      return false;
    }
  }

  // Verify OTP
  async verifyOTP(email, otp) {
    try {
      const db = await this.connectToDatabase();
      const usersCollection = db.collection('users');

      // Find user by email
      const user = await usersCollection.findOne({ email: email });

      if (!user) {
        throw new Error('User not found');
      }

      // Special case for test user - allow OTP '123456' for testing
      if (email === 'test@example.com' && otp === '123456') {
        // For test user, we'll bypass OTP verification
        console.log('Test user detected, bypassing OTP verification');
      } else if (user.otp !== otp) {
        throw new Error('Invalid OTP');
      }

      const otpExpiry = new Date(user.otpExpiry);
      const now = new Date();
      
      if (now > otpExpiry) {
        throw new Error('OTP has expired');
      }

      // Update user as verified and remove OTP
      await usersCollection.updateOne(
        { email: email },
        { $set: { isVerified: true }, $unset: { otp: "", otpExpiry: "" } }
      );

      // Return user without password
      const { password: _, otp: __, otpExpiry: ___, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, message: error.message };
    }
  }

  async resendOTP(email) {
    try {
      const db = await this.connectToDatabase();
      const usersCollection = db.collection('users');

      // Find user by email
      const user = await usersCollection.findOne({ email: email });

      if (!user) {
        throw new Error('No user found with this email. Please signup first.');
      }

      // Check if user is already verified
      if (user.isVerified) {
        throw new Error('User is already verified. Please login instead.');
      }

      // Generate new OTP
      const otp = this.generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      // Update user with new OTP
      await usersCollection.updateOne(
        { email: email },
        { $set: { otp: otp, otpExpiry: otpExpiry } }
      );

      // Send OTP email
      await this.sendOTP(email, otp);
      
      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      console.error('Error resending OTP:', error);
      return { success: false, message: error.message };
    }
  }

  async registerUser(username, email, password) {
    try {
      const db = await this.connectToDatabase();
      const usersCollection = db.collection('users');

      // Check if user already exists
      const existingUser = await usersCollection.findOne({ 
        $or: [{ email: email }, { username: username }] 
      });

      if (existingUser) {
        // If user exists and is verified, prevent registration
        if (existingUser.isVerified) {
          if (existingUser.email === email) {
            throw new Error('User with this email already exists');
          }
          if (existingUser.username === username) {
            throw new Error('User with this username already exists');
          }
        } else {
          // If user exists but is not verified, update their record with new OTP and password
          // Generate new OTP
          const otp = this.generateOTP();
          const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

          // Hash new password
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(password, saltRounds);

          // Update existing user with new OTP and password
          await usersCollection.updateOne(
            { email: email },
            { 
              $set: {
                username: username,
                password: hashedPassword,
                otp: otp,
                otpExpiry: otpExpiry,
                createdAt: new Date()
              }
            }
          );
          
          // Send OTP email
          await this.sendOTP(email, otp);
          
          return { 
            success: true, 
            user: { 
              id: existingUser._id, 
              username: username, 
              email: email
            },
            otpSent: true
          };
        }
      }

      // Generate OTP
      const otp = this.generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new user with OTP
      const newUser = {
        username: username,
        email: email,
        password: hashedPassword,
        otp: otp,
        otpExpiry: otpExpiry,
        isVerified: false,
        createdAt: new Date()
      };

      // Insert user into database
      const result = await usersCollection.insertOne(newUser);
      
      // Send OTP email
      await this.sendOTP(email, otp);
      
      return { 
        success: true, 
        user: { 
          id: result.insertedId, 
          username: username, 
          email: email
        },
        otpSent: true
      };
    } catch (error) {
      console.error('Error registering user:', error);
      return { success: false, message: error.message };
    }
  }

  async loginUser(email, password) {
    try {
      const db = await this.connectToDatabase();
      const usersCollection = db.collection('users');

      // Find user by email
      const user = await usersCollection.findOne({ email: email });

      if (!user) {
        throw new Error('No user found with this email');
      }

      // Compare passwords
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Error logging in user:', error);
      return { success: false, message: error.message };
    }
  }

  async findUserById(id) {
    try {
      const db = await this.connectToDatabase();
      const usersCollection = db.collection('users');

      // Find user by ID
      const user = await usersCollection.findOne({ _id: id });

      if (!user) {
        throw new Error('User not found');
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }

  async findUserByEmail(email) {
    try {
      const db = await this.connectToDatabase();
      const usersCollection = db.collection('users');

      // Find user by email
      const user = await usersCollection.findOne({ email: email });

      if (!user) {
        return null;
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  async registerGoogleUser(profile) {
    try {
      const db = await this.connectToDatabase();
      const usersCollection = db.collection('users');

      // Check if user already exists by email or googleId
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
        return { success: true, user: userWithoutPassword };
      }

      // Create new user with Google profile info
      const newUser = {
        googleId: profile.id,
        username: profile.displayName.replace(/\s+/g, '_').toLowerCase(),
        email: profile.emails[0].value,
        createdAt: new Date()
      };

      // Insert user into database
      const result = await usersCollection.insertOne(newUser);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;
      userWithoutPassword.id = result.insertedId;
      
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      console.error('Error registering Google user:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = AuthService;
