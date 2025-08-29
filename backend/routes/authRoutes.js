import { Router } from 'express';
import { register, login, forgotPassword, resetPassword } from '../controllers/authController.js';
import passport from 'passport';

const r = Router();
r.post('/register', register);
r.post('/login', login);
r.post('/forgot-password', forgotPassword);
r.post('/reset-password', resetPassword);

// Google OAuth routes
r.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
r.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: process.env.CLIENT_URL + '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    const token = req.user.generateAuthToken(); // Assuming a method to generate a token
    res.redirect(`${process.env.CLIENT_URL}/dashboard?token=${token}`);
  }
);

// GitHub OAuth routes
r.get('/github', passport.authenticate('github', { scope: [ 'user:email' ] }));
r.get('/github/callback', 
  passport.authenticate('github', { failureRedirect: process.env.CLIENT_URL + '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    const token = req.user.generateAuthToken(); // Assuming a method to generate a token
    res.redirect(`${process.env.CLIENT_URL}/dashboard?token=${token}`);
  }
);

export default r;
