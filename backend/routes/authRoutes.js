const express = require('express');
const router = express.Router();
const { authService } = require('../db/database');

// Signup route
router.post('/signup', async (req, res) => {
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
router.post('/verify-otp', async (req, res) => {
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
router.post('/login', async (req, res) => {
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
router.post('/resend-otp', async (req, res) => {
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

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Delete account route (cascade-deletes chat history too)
router.delete('/auth/user', async (req, res) => {
  try {
    // Check authentication manually (ensureAuthenticated not used here so we can access session.destroy)
    const userId = req.session.user?._id || req.session.passport?.user?._id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await authService.deleteUser(userId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    // Destroy session after account deletion
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session after account deletion:', err);
      }
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Account and chat history deleted successfully' });
    });
  } catch (error) {
    console.error('Error in delete account endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
