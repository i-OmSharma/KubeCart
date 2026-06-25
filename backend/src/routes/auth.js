const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user');

const router = express.Router();

async function handleSignup(req, res) {
  const email = req.body.email || req.body.username;
  const { password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }
  try {
    const existing = await userModel.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const result = await userModel.create(email, hash);
    const token = jwt.sign({ userId: result.id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, access_token: token });
  } catch (err) {
    console.error('signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
}

router.post('/signup', handleSignup);
router.post('/register', handleSignup);

router.post('/login', async (req, res) => {
  const email = req.body.email || req.body.username;
  const { password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }
  try {
    const user = await userModel.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, access_token: token, user_id: user.id, username: user.email });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
