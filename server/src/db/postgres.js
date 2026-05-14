const { Pool } = require('pg');
require('dotenv').config({ path: '../../../.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function loadCSVIntoTable(tableName, rows) {
  const columns = Object.keys(rows[0]);

  // Clean column names — remove spaces and special chars
  const cleanCols = columns.map(c => c.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase());

  await pool.query(`DROP TABLE IF EXISTS "${tableName}"`);

  const colDefs = cleanCols.map(c => `"${c}" TEXT`).join(', ');
  await pool.query(`CREATE TABLE "${tableName}" (${colDefs})`);

  // Bulk insert in chunks of 500 rows
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const valuePlaceholders = chunk.map((_, rowIdx) =>
      `(${cleanCols.map((_, colIdx) => `$${rowIdx * cleanCols.length + colIdx + 1}`).join(', ')})`
    ).join(', ');

    const flatValues = chunk.flatMap(row => columns.map(c => {
      const val = row[c];
      return val === '' || val === undefined ? null : String(val);
    }));

    const colNames = cleanCols.map(c => `"${c}"`).join(', ');
    await pool.query(
      `INSERT INTO "${tableName}" (${colNames}) VALUES ${valuePlaceholders}`,
      flatValues
    );

    console.log(`Inserted ${Math.min(i + chunkSize, rows.length)}/${rows.length} rows...`);
  }

  return cleanCols;
}

async function getTableSchema(tableName) {
  const { rows } = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  return `Table "${tableName}": ${rows.map(r => `${r.column_name} (${r.data_type})`).join(', ')}`;
}

module.exports = { pool, loadCSVIntoTable, getTableSchema };