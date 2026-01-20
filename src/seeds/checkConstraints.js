const pool = require('../config/database');

async function checkConstraints() {
  try {
    const result = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE connamespace = 'master'::regnamespace
      AND conname LIKE '%status%'
    `);
    
    console.log('Status constraints:');
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkConstraints();
