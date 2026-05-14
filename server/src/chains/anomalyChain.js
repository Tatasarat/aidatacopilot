const { ChatMistralAI } = require('@langchain/mistralai');
const { PromptTemplate } = require('@langchain/core/prompts');

const llm = new ChatMistralAI({
  model: 'mistral-large-latest',
  temperature: 0,
  apiKey: process.env.MISTRAL_API_KEY
});

async function detectAnomalies(question, sqlQuery, results) {
  const prompt = PromptTemplate.fromTemplate(`
You are a data analyst. The user asked: "{question}"
The SQL run was: {sql}
The results (JSON): {results}

Identify any anomalies, unexpected drops, spikes, or patterns.
Be specific - mention actual values. Keep it under 3 bullet points.
  `);

  const chain = prompt.pipe(llm);
  const response = await chain.invoke({
    question,
    sql: sqlQuery,
    results: JSON.stringify(results.slice(0, 50))
  });
  return response.content;
}

module.exports = { detectAnomalies };