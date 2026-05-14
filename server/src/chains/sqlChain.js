const { ChatMistralAI } = require('@langchain/mistralai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { getTableSchema } = require('../db/postgres');

const llm = new ChatMistralAI({
  model: 'mistral-large-latest',
  temperature: 0,
  apiKey: process.env.MISTRAL_API_KEY
});

async function generateSQL(userQuestion, tableName) {
  const schema = await getTableSchema(tableName);

  const prompt = PromptTemplate.fromTemplate(`
You are an expert SQL analyst working with PostgreSQL.
Given the table schema below, write a single SQL query to answer the user question.
Return ONLY the SQL query, no explanation, no markdown, no backticks.

Schema:
{schema}

Important rules:
- Always use double quotes around column names
- The table name is "{tableName}"
- Return ONLY raw SQL, nothing else

Question: {question}

SQL:
  `);

  const chain = prompt.pipe(llm);
  const response = await chain.invoke({ schema, question: userQuestion, tableName });
  return response.content.trim().replace(/```sql|```/g, '').trim();
}

module.exports = { generateSQL };