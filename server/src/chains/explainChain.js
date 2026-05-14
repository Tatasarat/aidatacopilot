const { ChatMistralAI } = require('@langchain/mistralai');
const { PromptTemplate } = require('@langchain/core/prompts');

const llm = new ChatMistralAI({
  model: 'mistral-large-latest',
  temperature: 0.3,
  apiKey: process.env.MISTRAL_API_KEY
});

async function explainResults(question, results, anomalies) {
  const prompt = PromptTemplate.fromTemplate(`
You are a friendly business analyst. Explain these results in plain English
for a non-technical executive. Be concise (3-4 sentences max).

Original question: {question}
Data summary: {results}
Anomalies found: {anomalies}
  `);

  const chain = prompt.pipe(llm);
  const response = await chain.invoke({
    question,
    results: JSON.stringify(results.slice(0, 20)),
    anomalies
  });
  return response.content;
}

module.exports = { explainResults };