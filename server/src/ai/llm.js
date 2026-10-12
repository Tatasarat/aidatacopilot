'use strict';
let cached;

/** Returns a Mistral chat model, or null when no API key is configured (the app then uses built-in rules). */
function getLlm() {
  if (cached !== undefined) return cached;
  if (!process.env.MISTRAL_API_KEY) {
    cached = null;
    return cached;
  }
  try {
    const { ChatMistralAI } = require('@langchain/mistralai');
    cached = new ChatMistralAI({
      model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
      temperature: 0,
      maxTokens: 500,
      apiKey: process.env.MISTRAL_API_KEY,
    });
  } catch (err) {
    console.error('Could not start the AI model:', err.message);
    cached = null;
  }
  return cached;
}

function contentToString(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c === 'string' ? c : c.text || '')).join('');
  return '';
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('AI request timed out')), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

module.exports = { getLlm, contentToString, withTimeout };
