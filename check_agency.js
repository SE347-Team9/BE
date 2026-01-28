const pool = require('./src/config/database');

async function checkAgency() {
  try {
    const result = await pool.query(
      'SELECT agency_id, code, name, current_debt, debt_limit FROM master.agency LIMIT 3'
    );
    console.log('Agency data from database:');
    console.log(JSON.stringify(result.rows, null, 2));
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAgency();
