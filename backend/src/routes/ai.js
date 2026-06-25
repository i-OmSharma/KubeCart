const express = require('express');
const authMiddleware = require('../middleware/auth');
const { generateProducts } = require('../ai/productGenerator');

const router = express.Router();
router.use(authMiddleware);

router.post('/generate-products', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  try {
    const products = await generateProducts(prompt);
    res.json({ products });
  } catch (err) {
    console.error('AI product generation error:', err);
    res.status(500).json({ error: 'AI generation failed: ' + err.message });
  }
});

module.exports = router;
