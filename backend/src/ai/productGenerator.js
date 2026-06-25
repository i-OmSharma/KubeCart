const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateProducts(userPrompt) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
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

  const text = message.content[0].text;
  const parsed = JSON.parse(text);
  return parsed.products;
}

module.exports = { generateProducts };
