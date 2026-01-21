const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');

// Login
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing username or password',
      });
    }

    const query = 'SELECT * FROM auth.account WHERE username = $1';
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    const account = result.rows[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(password, account.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Get user info from auth.user table
    const userQuery = 'SELECT * FROM auth."user" WHERE account_id = $1';
    const userResult = await pool.query(userQuery, [account.account_id]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User information not found',
      });
    }

    // Get the appropriate ID for token
    let userId = user.user_id;
    let agencyId = user.agency_id || null;

    // Generate token
    const token = generateToken(userId, account.role, agencyId);

    res.json({
      success: true,
      data: {
        id: account.account_id,
        username: account.username,
        fullName: user.full_name,
        role: account.role,
        token,
      },
      message: 'Login successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed: ' + error.message,
    });
  }
}

module.exports = {
  login,
};
