const Groq = require('groq-sdk');
const { coreV1 } = require('../k8s/client');

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function diagnoseFailure(namespace) {
  let podStatus = 'No pod data available.';
  let eventMessages = 'No event data available.';

  try {
    const podsRes = await coreV1.listNamespacedPod(namespace);
    podStatus = podsRes.body.items
      .map(p => {
        const waitReason = p.status?.containerStatuses?.[0]?.state?.waiting?.reason || '';
        const waitMsg = p.status?.containerStatuses?.[0]?.state?.waiting?.message || '';
        return `${p.metadata.name}: phase=${p.status?.phase || 'unknown'} ${waitReason ? `waiting=${waitReason}` : ''} ${waitMsg ? `msg=${waitMsg}` : ''}`.trim();
      })
      .join('\n') || 'No pods found.';
  } catch (_) {}

  try {
    const eventsRes = await coreV1.listNamespacedEvent(namespace);
    eventMessages = eventsRes.body.items
      .filter(e => e.type === 'Warning')
      .map(e => `[${e.reason}] ${e.message}`)
      .join('\n') || 'No warning events.';
  } catch (_) {}

  const message = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `A Kubernetes WooCommerce store deployment failed in namespace "${namespace}".

Pod Status:
${podStatus}

K8s Warning Events:
${eventMessages}

Explain in simple terms:
1. What went wrong
2. Why it happened
3. How to fix it

Keep it under 100 words, clear and actionable.`,
      },
    ],
  });

  return message.choices[0].message.content.trim();
}

module.exports = { diagnoseFailure };
