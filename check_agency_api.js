const pool = require('./src/config/database');

async function checkAgencyAPI() {
  try {
    // Simulate the getAgencyById query
    const id = 15; // DL001
    const query = `
      SELECT 
        ag.agency_id AS id,
        ag.code,
        ag.name,
        ag.address,
        ag.phone,
        ag.email,
        ag.level,
        ag.sales_volume AS "salesVolume",
        ag.current_debt AS "currentDebt",
        ag.debt_limit AS "debtLimit",
        ag.managed_by_staff_id AS "managedByStaffId",
        ag.status,
        ag.created_at AS "createdAt",
        ag.updated_at AS "updatedAt",
        st.full_name AS "managerName"
      FROM master.agency ag
      LEFT JOIN master.staff st ON st.staff_id = ag.managed_by_staff_id
      WHERE ag.agency_id = $1
    `;
    const result = await pool.query(query, [id]);
    
    console.log('API response for agency 15 (DL001):');
    console.log(JSON.stringify(result.rows[0], null, 2));
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAgencyAPI();
