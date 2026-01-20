const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// GET all accounts
async function getAllAccounts(req, res) {
  try {
    const { role } = req.query;
    
    let query = `
      SELECT 
        a.account_id AS id,
        a.code,
        a.username,
        a.role,
        a.status,
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt",
        u.full_name AS "fullName",
        u.email,
        u.phone,
        u.staff_id AS "staffId",
        u.agency_id AS "agencyId"
      FROM auth.account a
      LEFT JOIN auth."user" u ON u.account_id = a.account_id
    `;
    
    // Filter by role if provided
    if (role) {
      query += ` WHERE a.role = $1 `;
    }
    
    query += ` ORDER BY a.created_at DESC `;
    
    const result = role 
      ? await pool.query(query, [role])
      : await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      message: 'Get accounts successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// GET one account
async function getAccountById(req, res) {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        a.account_id AS id,
        a.code,
        a.username,
        a.role,
        a.status,
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt",
        u.full_name AS "fullName",
        u.email,
        u.phone,
        u.agency_id AS "agencyId",
        u.staff_id AS "staffId"
      FROM auth.account a
      LEFT JOIN auth."user" u ON u.account_id = a.account_id
      WHERE a.account_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Get account successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// POST create account
async function createAccount(req, res) {
  const client = await pool.connect();
  
  try {
    const { username, email, fullName, phone, password, role, agencyName, agencyAddress } = req.body;

    // Validate
    if (!username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // If role is agency, validate agency fields
    if (role === 'agency') {
      if (!agencyName || !agencyAddress) {
        return res.status(400).json({
          success: false,
          message: 'Agency name and address are required for agency accounts',
        });
      }
    }

    await client.query('BEGIN');

    // Auto-generate account code based on role
    let accountCode;
    let prefix;
    
    switch (role) {
      case 'admin':
        prefix = 'ADM';
        break;
      case 'agency':
        prefix = 'DL';
        break;
      case 'staff':
        prefix = 'NV';
        break;
      default:
        prefix = 'ACC';
    }
    
    // Find max existing number for this prefix and increment
    const maxCodeResult = await client.query(
      `SELECT code FROM auth.account WHERE code LIKE $1 ORDER BY code DESC LIMIT 1`,
      [`${prefix}%`]
    );
    
    let nextNumber = 1;
    if (maxCodeResult.rows.length > 0) {
      const maxCode = maxCodeResult.rows[0].code;
      const maxNumber = parseInt(maxCode.replace(prefix, ''));
      nextNumber = maxNumber + 1;
    }
    
    accountCode = `${prefix}${String(nextNumber).padStart(3, '0')}`;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create account
    const accountQuery = `
      INSERT INTO auth.account (code, username, password_hash, role, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING *
    `;

    const accountResult = await client.query(accountQuery, [
      accountCode, username, hashedPassword, role
    ]);

    const newAccount = accountResult.rows[0];

    // Create user record
    let agencyId = null;
    let staffId = null;

    // If role is agency, create agency record first
    if (role === 'agency') {
      const agencyQuery = `
        INSERT INTO master.agency (code, name, address, phone, email, level, sales_volume, current_debt, debt_limit, status)
        VALUES ($1, $2, $3, $4, $5, 3, 0, 0, 30000000, 'active')
        RETURNING agency_id
      `;

      const agencyResult = await client.query(agencyQuery, [
        accountCode, // Dùng cùng code với account
        agencyName,
        agencyAddress,
        phone,
        email
      ]);
      agencyId = agencyResult.rows[0].agency_id;
    }

    // If role is staff, create staff record first
    if (role === 'staff') {
      const staffQuery = `
        INSERT INTO master.staff (code, full_name, phone, email, status)
        VALUES ($1, $2, $3, $4, 'active')
        RETURNING staff_id
      `;

      const staffResult = await client.query(staffQuery, [
        accountCode, // Dùng cùng code với account
        fullName,
        phone,
        email
      ]);
      staffId = staffResult.rows[0].staff_id;
    }

    // Create user info
    const userQuery = `
      INSERT INTO auth."user" (account_id, full_name, email, phone, agency_id, staff_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    await client.query(userQuery, [
      newAccount.account_id,
      fullName,
      email,
      phone,
      agencyId,
      staffId
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: newAccount,
      message: 'Account created successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    
    console.log('Error creating account:', error.code, error.constraint, error.detail);
    
    if (error.code === '23505') {
      // Check which constraint was violated
      if (error.constraint === 'account_username_key') {
        return res.status(400).json({
          success: false,
          message: 'Username already exists',
        });
      }
      if (error.constraint === 'user_email_key') {
        return res.status(400).json({
          success: false,
          message: 'Email already exists',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  } finally {
    client.release();
  }
}

// PUT update account
async function updateAccount(req, res) {
  try {
    const { id } = req.params;
    const { fullName, phone, status } = req.body;

    // Update account status
    if (status) {
      await pool.query(
        'UPDATE auth.account SET status = $1 WHERE account_id = $2',
        [status, id]
      );
    }

    // Update user info
    const query = `
      UPDATE auth."user"
      SET full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone)
      WHERE account_id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [fullName, phone, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Account updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  }
}

// DELETE account
async function deleteAccount(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Fetch role and linked ids before deletion to clean up master tables
    const fetchQuery = `
      SELECT a.account_id, a.role, a.code, u.agency_id, u.staff_id
      FROM auth.account a
      LEFT JOIN auth."user" u ON u.account_id = a.account_id
      WHERE a.account_id = $1
    `;

    const accountResult = await client.query(fetchQuery, [id]);

    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    const account = accountResult.rows[0];

    // Remove related records in master schema if present
    if (account.role === 'agency') {
      if (account.agency_id) {
        await client.query('DELETE FROM master.agency WHERE agency_id = $1', [account.agency_id]);
      } else {
        await client.query('DELETE FROM master.agency WHERE code = $1', [account.code]);
      }
    }

    if (account.role === 'staff') {
      if (account.staff_id) {
        await client.query('DELETE FROM master.staff WHERE staff_id = $1', [account.staff_id]);
      } else {
        await client.query('DELETE FROM master.staff WHERE code = $1', [account.code]);
      }
    }

    const deleteQuery = 'DELETE FROM auth.account WHERE account_id = $1 RETURNING *';
    const deleteResult = await client.query(deleteQuery, [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      data: deleteResult.rows[0],
      message: 'Account deleted successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');

    // Likely caused by existing references (issues, payments...) blocking delete
    if (error.code === '23503') {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete account because related records exist. Remove or reassign linked transactions first.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message,
    });
  } finally {
    client.release();
  }
}

module.exports = {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
};
