import express from 'express';
import passport from 'passport';
import { generateToken, authenticateToken } from '../config/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Check if Google OAuth is configured
const hasGoogleCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

// Google OAuth routes (only if credentials are available)
if (hasGoogleCredentials) {
    router.get('/google',
        passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    router.get('/google/callback',
        passport.authenticate('google', { failureRedirect: '/login' }),
        (req, res) => {
            // Successful authentication
            const token = generateToken(req.user);
            
            // Redirect to frontend with token (FIXED FOR PORT 3001)
            const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/callback?token=${token}`;
            res.redirect(redirectUrl);
        }
    );
} else {
    // Fallback routes when OAuth is not configured
    router.get('/google', (req, res) => {
        res.status(503).json({ 
            error: 'Google OAuth not configured',
            message: 'Please set up GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables'
        });
    });

    router.get('/google/callback', (req, res) => {
        res.status(503).json({ 
            error: 'Google OAuth not configured',
            message: 'Please set up GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables'
        });
    });
}

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-__v');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user: user.profile });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // Update last login (optional - for tracking)
        await User.findByIdAndUpdate(req.user.id, { lastLogin: new Date() });
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const newToken = generateToken(user);
        res.json({ token: newToken, user: user.profile });
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
    try {
        const { theme, notifications } = req.body;
        const updateData = {};
        
        if (theme !== undefined) updateData['preferences.theme'] = theme;
        if (notifications !== undefined) updateData['preferences.notifications'] = notifications;
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { new: true }
        ).select('-__v');
        
        res.json({ user: user.profile });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router }; 