const Groq = require('groq-sdk');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function generateProducts(userPrompt) {
  const message = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `You are a WooCommerce store setup assistant.

User wants to create a store: "${userPrompt}"

Generate exactly 5 products for this store.
Respond ONLY with valid JSON, no markdown, no explanation:
{
  "products": [
    { "name": "Product Name", "price": 299, "description": "Short description" }
  ]
}`,
      },
    ],
  });

  const text = message.choices[0].message.content.trim();
  const parsed = JSON.parse(text);
  return parsed.products;
}

module.exports = { generateProducts };
