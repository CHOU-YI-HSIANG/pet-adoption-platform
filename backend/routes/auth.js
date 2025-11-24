const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { validateBody } = require('../middleware/validation');
const {
  userRegisterSchema,
  userLoginSchema,
  userUpdateSchema
} = require('../utils/validators');
const router = express.Router();

// Google OAuth Client
const googleClient = process.env.GOOGLE_CLIENT_ID 
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

// Middleware: Authenticate JWT Token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid user account' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Register
router.post('/register', validateBody(userRegisterSchema), async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      name,
      firstName,
      lastName,
      phone,
      address
    } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    const user = new User({
      username,
      email,
      password,
      name: name || `${firstName || ''} ${lastName || ''}`.trim(),
      firstName,
      lastName,
      contact_info: {
        phone: phone
      },
      address
    });

    await user.save();

    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: user.toSafeObject()
    });

  } catch (error) {
    res.status(400).json({
      error: 'Registration failed',
      details: error.message
    });
  }
});

// Login
router.post('/login', validateBody(userLoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    await user.updateLastLogin();

    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: user.toSafeObject()
    });

  } catch (error) {
    res.status(500).json({
      error: 'Login failed',
      details: error.message
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: req.user.toSafeObject()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get user info'
    });
  }
});

// Update profile
router.put('/profile', authenticateToken, validateBody(userUpdateSchema), async (req, res) => {
  try {
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'address', 'preferences'
    ];
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user: user.toSafeObject()
    });

  } catch (error) {
    res.status(400).json({
      error: 'Profile update failed',
      details: error.message
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(req.user._id);

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Password change failed',
      details: error.message
    });
  }
});

// Delete account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Password required to delete account'
      });
    }

    const user = await User.findById(req.user._id);

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(400).json({
        error: 'Incorrect password'
      });
    }

    user.isActive = false;
    await user.save();

    res.json({
      message: 'Account deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Account deletion failed',
      details: error.message
    });
  }
});

// Verify token
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    res.json({
      valid: true,
      user: user.toSafeObject()
    });

  } catch (error) {
    res.status(401).json({
      valid: false,
      error: 'Invalid token'
    });
  }
});

// ==================== Google OAuth Routes ====================

// Google One Tap / Sign-In with Google Token 驗證
router.post('/google/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Google token required'
      });
    }

    if (!googleClient) {
      return res.status(503).json({
        error: 'Google OAuth not configured',
        details: 'GOOGLE_CLIENT_ID not set in environment variables'
      });
    }

    // 驗證 Google Token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const {
      sub: googleId,
      email,
      given_name: firstName,
      family_name: lastName,
      name,
      picture: avatar_url,
      email_verified
    } = payload;

    if (!email_verified) {
      return res.status(400).json({
        error: 'Email not verified',
        details: 'Please verify your email with Google'
      });
    }

    // 查找或建立使用者
    let user = await User.findOne({ 
      $or: [
        { email },
        { googleId }
      ]
    });

    if (user) {
      // 更新現有使用者的 Google 資訊
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (avatar_url && !user.avatar_url) {
        user.avatar_url = avatar_url;
      }
      await user.updateLastLogin();
      await user.save();
    } else {
      // 建立新使用者
      user = new User({
        email,
        googleId,
        firstName: firstName || '',
        lastName: lastName || '',
        name: name || email.split('@')[0],
        username: email.split('@')[0] + '_' + Date.now(),
        avatar_url,
        isEmailVerified: true,
        authProvider: 'google'
      });
      await user.save();
    }

    // 生成 JWT Token
    const jwtToken = jwt.sign(
      { 
        userId: user._id,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Google login successful',
      token: jwtToken,
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Google verification error:', error);
    res.status(500).json({
      error: 'Google verification failed',
      details: error.message
    });
  }
});

// Google OAuth Redirect Flow (傳統方式)
router.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({
      error: 'Google OAuth not configured'
    });
  }

  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 
    `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=openid%20email%20profile&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.redirect(googleAuthUrl);
});

// Google OAuth Callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_auth_failed`);
    }

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=no_code`);
    }

    // 交換 code 獲取 access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.id_token) {
      throw new Error('No id_token received');
    }

    // 驗證 ID Token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenData.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const {
      sub: googleId,
      email,
      given_name: firstName,
      family_name: lastName,
      name,
      picture: avatar_url,
      email_verified
    } = payload;

    if (!email_verified) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=email_not_verified`);
    }

    // 查找或建立使用者
    let user = await User.findOne({ 
      $or: [
        { email },
        { googleId }
      ]
    });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (avatar_url && !user.avatar_url) {
        user.avatar_url = avatar_url;
      }
      await user.updateLastLogin();
      await user.save();
    } else {
      user = new User({
        email,
        googleId,
        firstName: firstName || '',
        lastName: lastName || '',
        name: name || email.split('@')[0],
        username: email.split('@')[0] + '_' + Date.now(),
        avatar_url,
        isEmailVerified: true,
        authProvider: 'google'
      });
      await user.save();
    }

    // 生成 JWT Token
    const jwtToken = jwt.sign(
      { 
        userId: user._id,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 重定向回前端並帶上 token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${jwtToken}`);

  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=callback_failed`);
  }
});

module.exports = router;

