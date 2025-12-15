const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/social/youtube/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// YouTube OAuth scopes
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

// Store state tokens temporarily (in production, use Redis or similar)
const pendingOAuthStates = new Map();

// ============================================
// YouTube OAuth Routes
// ============================================

// Initiate YouTube OAuth - returns the authorization URL
router.get('/youtube/auth', protect, (req, res) => {
  try {
    // Generate a random state token for security
    const state = Buffer.from(JSON.stringify({
      userId: req.user._id.toString(),
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(7)
    })).toString('base64');

    // Store the state for verification
    pendingOAuthStates.set(state, {
      userId: req.user._id.toString(),
      createdAt: Date.now()
    });

    // Clean up old states (older than 10 minutes)
    for (const [key, value] of pendingOAuthStates.entries()) {
      if (Date.now() - value.createdAt > 10 * 60 * 1000) {
        pendingOAuthStates.delete(key);
      }
    }

    // Build the Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', YOUTUBE_SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    res.json({
      success: true,
      authUrl: authUrl.toString()
    });
  } catch (error) {
    console.error('YouTube auth initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate YouTube authentication'
    });
  }
});

// YouTube OAuth callback - handles the redirect from Google
router.get('/youtube/callback', async (req, res) => {
  const { code, state, error } = req.query;

  // Handle user denial or errors
  if (error) {
    console.log('OAuth error:', error);
    return res.redirect(`${FRONTEND_URL}/#/connect-socials?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/#/connect-socials?error=missing_parameters`);
  }

  try {
    // Verify the state token
    const stateData = pendingOAuthStates.get(state);
    if (!stateData) {
      console.log('Invalid or expired state token');
      return res.redirect(`${FRONTEND_URL}/#/connect-socials?error=invalid_state`);
    }

    // Remove used state
    pendingOAuthStates.delete(state);

    const userId = stateData.userId;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code: code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData);
      return res.redirect(`${FRONTEND_URL}/#/connect-socials?error=token_exchange_failed`);
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Get YouTube channel info
    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }
    );

    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      console.log('No YouTube channel found for user');
      return res.redirect(`${FRONTEND_URL}/#/connect-socials?error=no_channel`);
    }

    const channel = channelData.items[0];
    const channelInfo = {
      platform: 'YouTube',
      accountId: channel.id,
      accountName: channel.snippet.title,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      channelData: {
        title: channel.snippet.title,
        description: channel.snippet.description,
        thumbnailUrl: channel.snippet.thumbnails?.default?.url || '',
        subscriberCount: channel.statistics?.subscriberCount || '0',
        videoCount: channel.statistics?.videoCount || '0',
        viewCount: channel.statistics?.viewCount || '0'
      },
      connectedAt: new Date()
    };

    // Update user's connected socials
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(`${FRONTEND_URL}/#/connect-socials?error=user_not_found`);
    }

    // Remove existing YouTube connection if any
    user.connectedSocials = user.connectedSocials.filter(s => s.platform !== 'YouTube');
    
    // Add new connection
    user.connectedSocials.push(channelInfo);
    await user.save();

    console.log(`YouTube connected for user ${userId}: ${channelInfo.accountName}`);

    // Redirect back to frontend with success
    res.redirect(`${FRONTEND_URL}/#/connect-socials?youtube=connected&channel=${encodeURIComponent(channelInfo.accountName)}`);

  } catch (error) {
    console.error('YouTube callback error:', error);
    res.redirect(`${FRONTEND_URL}/#/connect-socials?error=callback_failed`);
  }
});

// Disconnect YouTube
router.post('/youtube/disconnect', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Find YouTube connection to potentially revoke token
    const youtubeConnection = user.connectedSocials.find(s => s.platform === 'YouTube');
    
    if (youtubeConnection && youtubeConnection.accessToken) {
      // Try to revoke the token (optional, may fail if token expired)
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${youtubeConnection.accessToken}`, {
          method: 'POST'
        });
      } catch (e) {
        console.log('Token revocation failed (may be expired):', e.message);
      }
    }

    // Remove YouTube from connected socials
    user.connectedSocials = user.connectedSocials.filter(s => s.platform !== 'YouTube');
    await user.save();

    res.json({
      success: true,
      message: 'YouTube disconnected successfully'
    });
  } catch (error) {
    console.error('YouTube disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect YouTube'
    });
  }
});

// Get connected socials status
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Build status for all platforms
    const platforms = ['Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'YouTube', 'TikTok', 'Pinterest', 'Snapchat', 'Reddit'];
    
    const connections = platforms.map(platform => {
      const connection = user.connectedSocials.find(s => s.platform === platform);
      
      if (connection) {
        return {
          platform,
          connected: true,
          username: connection.accountName || connection.accountId,
          status: 'active',
          connectedAt: connection.connectedAt,
          channelData: connection.channelData || null
        };
      }
      
      return {
        platform,
        connected: false,
        username: null,
        status: 'inactive'
      };
    });

    res.json({
      success: true,
      connections
    });
  } catch (error) {
    console.error('Get socials status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get social connections status'
    });
  }
});

module.exports = router;
