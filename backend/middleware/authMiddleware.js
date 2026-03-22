// Middleware to check if user is authenticated
function ensureAuthenticated(req, res, next) {
  console.log('Session check:', req.session);
  console.log('Session user:', req.session.user);
  console.log('Passport user:', req.session.passport && req.session.passport.user);

  // Check for user authenticated via manual login/signup
  if (req.session.user) {
    return next();
  }

  // For Google OAuth users, check passport session and set session.user
  if (req.session.passport && req.session.passport.user) {
    req.session.user = req.session.passport.user;
    return next();
  }

  res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { ensureAuthenticated };
