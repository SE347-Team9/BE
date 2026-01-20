const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminAccount() {
  try {
    console.log('\n=== TẠO TÀI KHOẢN ADMIN ===\n');
    
    const username = await question('Nhập username: ');
    const password = await question('Nhập password: ');
    const fullName = await question('Nhập họ tên (mặc định: Administrator): ') || 'Administrator';
    const email = await question('Nhập email (mặc định: admin@system.com): ') || 'admin@system.com';
    const phone = await question('Nhập số điện thoại (mặc định: 0900000000): ') || '0900000000';
    
    if (!username || !password) {
      console.error('\n❌ Username và password không được để trống!');
      process.exit(1);
    }
    
    if (password.length < 6) {
      console.error('\n❌ Password phải có ít nhất 6 ký tự!');
      process.exit(1);
    }
    
    console.log('\n⏳ Đang tạo tài khoản...');
    
    // Hash password
    const hash = await bcrypt.hash(password, 10);
    
    // Check if username exists
    const checkUser = await pool.query(
      "SELECT username FROM auth.account WHERE username = $1",
      [username]
    );
    
    if (checkUser.rows.length > 0) {
      const overwrite = await question('\n⚠️  Username đã tồn tại. Ghi đè? (y/n): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('\n❌ Hủy bỏ.');
        process.exit(0);
      }
      
      // Delete old account
      await pool.query("DELETE FROM auth.account WHERE username = $1", [username]);
      console.log('✓ Đã xóa tài khoản cũ');
    }
    
    // Auto-generate code based on role (always admin in this script)
    const role = 'admin';
    const prefix = 'ADM';
    
    // Get the next number for admin role
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM auth.account WHERE code LIKE $1`,
      [`${prefix}%`]
    );
    
    const nextNumber = parseInt(countResult.rows[0].count) + 1;
    const code = `${prefix}${String(nextNumber).padStart(3, '0')}`;
    
    // Insert account
    const result = await pool.query(
      `INSERT INTO auth.account (code, username, password_hash, role, status, created_at) 
       VALUES ($1, $2, $3, 'admin', 'active', NOW()) 
       RETURNING account_id, username, code`,
      [code, username, hash]
    );
    
    const accountId = result.rows[0].account_id;
    console.log('✓ Đã tạo tài khoản:', result.rows[0].code);
    
    // Insert user info
    await pool.query(
      `INSERT INTO auth."user" (account_id, full_name, email, phone, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [accountId, fullName, email, phone]
    );
    console.log('✓ Đã tạo thông tin user');
    
    // Verify
    console.log('\n=== THÔNG TIN TÀI KHOẢN ===');
    console.log('Code:', result.rows[0].code);
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Họ tên:', fullName);
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Role: admin');
    console.log('Status: active');
    
    // Test login
    const testMatch = await bcrypt.compare(password, hash);
    console.log('\n✅ Tài khoản đã được tạo thành công!');
    console.log('Password test:', testMatch ? '✅ OK' : '❌ Failed');
    
    console.log('\n💡 Bạn có thể đăng nhập tại: http://localhost:5173');
    
  } catch (error) {
    console.error('\n❌ Lỗi:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

createAdminAccount();
