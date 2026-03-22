const express = require('express');
const router = express.Router();
const passport = require('passport');

// Initiate Google OAuth login flow
router.get('/auth/google/login', passport.authenticate('google-login', {
  scope: ['profile', 'email'],
  state: 'login'
}));

// Initiate Google OAuth signup flow
router.get('/auth/google/signup', passport.authenticate('google-signup', {
  scope: ['profile', 'email'],
  state: 'signup'
}));

// Generic Google OAuth callback route
router.get('/auth/google/callback',
  (req, res, next) => {
    // Determine which strategy to use based on the state parameter
    const state = req.query.state;
    console.log('Google OAuth callback received with state:', state);
    console.log('Full query parameters:', req.query);

    if (state && state.includes('signup')) {
      passport.authenticate('google-signup', (err, user, info) => {
        if (err) {
          console.error('Google signup authentication error:', err);
          return res.redirect('/?signupError=Authentication failed');
        }
        if (!user) {
          console.log('Google signup failed:', info);
          return res.redirect(`/?signupError=${info.message || 'Authentication failed'}`);
        }
        // Successfully authenticated, log the user in
        req.logIn(user, (err) => {
          if (err) {
            console.error('Error logging in user after Google signup:', err);
            return res.redirect('/?signupError=Could not log in user');
          }
          console.log('Google signup successful, redirecting to chatbot.html');
          return res.redirect('/chatbot.html');
        });
      })(req, res, next);
    } else {
      passport.authenticate('google-login', (err, user, info) => {
        if (err) {
          console.error('Google login authentication error:', err);
          return res.redirect('/?loginError=Authentication failed');
        }
        if (!user) {
          console.log('Google login failed:', info);
          return res.redirect(`/?loginError=${info.message || 'Authentication failed'}`);
        }
        // Successfully authenticated, log the user in
        req.logIn(user, (err) => {
          if (err) {
            console.error('Error logging in user after Google login:', err);
            return res.redirect('/?loginError=Could not log in user');
          }
          console.log('Google login successful, redirecting to chatbot.html');
          return res.redirect('/chatbot.html');
        });
      })(req, res, next);
    }
  }
);

module.exports = router;
