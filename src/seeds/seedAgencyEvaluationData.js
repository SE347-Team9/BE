// =====================================================
// SEED DATA: Tạo dữ liệu đại lý đa dạng để test duyệt cấp
// Run: node backend/src/seeds/seedAgencyEvaluationData.js
// =====================================================

const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedAgencyEvaluationData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting seed agency evaluation data...\n');

    // =====================================================
    // 1. TẠO ĐẠI LÝ VỚI CÁC KỊCH BẢN KHÁC NHAU
    // =====================================================
    
    const agencies = [
      // Kịch bản 1: Cấp 3 -> Đủ điều kiện lên Cấp 2
      {
        code: 'DL004',
        name: 'Đại lý Vượng',
        address: '100 Nguyễn Văn Linh, Quận 7',
        phone: '0232434242',
        email: 'agency04@gmail.com',
        level: 3,
        debtLimit: 30000000,
        // Sẽ tạo payments: 60 triệu (đã hoàn thành), đủ điều kiện lên cấp 2
        totalPayments: 60000000,
        completedPayments: 60000000,
        pendingPayments: 0
      },
      
      // Kịch bản 2: Cấp 3 -> Chưa đủ điều kiện lên Cấp 2
      {
        code: 'DL005',
        name: 'Đại lý Phát',
        address: '200 Lê Văn Việt, Quận 9',
        phone: '0232434243',
        email: 'agency05@gmail.com',
        level: 3,
        debtLimit: 30000000,
        // Chỉ có 30 triệu, chưa đủ 50 triệu
        totalPayments: 30000000,
        completedPayments: 30000000,
        pendingPayments: 0
      },
      
      // Kịch bản 3: Cấp 2 -> Đủ điều kiện lên Cấp 1
      {
        code: 'DL006',
        name: 'Đại lý Thịnh',
        address: '300 Xa lộ Hà Nội, Quận 2',
        phone: '0232434244',
        email: 'agency06@gmail.com',
        level: 2,
        debtLimit: 50000000,
        // 120 triệu, đủ điều kiện lên cấp 1
        totalPayments: 120000000,
        completedPayments: 120000000,
        pendingPayments: 0
      },
      
      // Kịch bản 4: Cấp 2 -> Chưa đủ điều kiện lên Cấp 1, chưa cần hạ cấp
      {
        code: 'DL007',
        name: 'Đại lý Tài',
        address: '400 Hoàng Văn Thụ, Tân Bình',
        phone: '0232434245',
        email: 'agency07@gmail.com',
        level: 2,
        debtLimit: 50000000,
        // 70 triệu, đủ duy trì cấp 2 nhưng chưa đủ lên cấp 1
        totalPayments: 70000000,
        completedPayments: 70000000,
        pendingPayments: 0
      },
      
      // Kịch bản 5: Cấp 2 -> Cần xem xét hạ xuống Cấp 3
      {
        code: 'DL008',
        name: 'Đại lý Lộc',
        address: '500 Phan Văn Trị, Gò Vấp',
        phone: '0232434246',
        email: 'agency08@gmail.com',
        level: 2,
        debtLimit: 50000000,
        // Chỉ có 20 triệu, không đủ duy trì cấp 2
        totalPayments: 20000000,
        completedPayments: 20000000,
        pendingPayments: 0
      },
      
      // Kịch bản 6: Cấp 1 -> Duy trì được Cấp 1
      {
        code: 'DL009',
        name: 'Đại lý Phúc',
        address: '600 Nguyễn Oanh, Gò Vấp',
        phone: '0232434247',
        email: 'agency09@gmail.com',
        level: 1,
        debtLimit: 100000000,
        // 150 triệu, duy trì tốt cấp 1
        totalPayments: 150000000,
        completedPayments: 150000000,
        pendingPayments: 0
      },
      
      // Kịch bản 7: Cấp 1 -> Cần xem xét hạ xuống Cấp 2
      {
        code: 'DL010',
        name: 'Đại lý An',
        address: '700 Quang Trung, Gò Vấp',
        phone: '0232434248',
        email: 'agency10@gmail.com',
        level: 1,
        debtLimit: 100000000,
        // Chỉ có 60 triệu, không đủ duy trì cấp 1
        totalPayments: 60000000,
        completedPayments: 60000000,
        pendingPayments: 0
      },
      
      // Kịch bản 8: Cấp 3 với công nợ cao
      {
        code: 'DL011',
        name: 'Đại lý Bình',
        address: '800 Cộng Hòa, Tân Bình',
        phone: '0232434249',
        email: 'agency11@gmail.com',
        level: 3,
        debtLimit: 30000000,
        // Có doanh số nhưng còn nợ nhiều
        totalPayments: 55000000,
        completedPayments: 40000000,
        pendingPayments: 15000000
      }
    ];

    // Lấy staff_id để gán cho agencies
    const staffResult = await client.query('SELECT staff_id FROM master.staff LIMIT 3');
    const staffIds = staffResult.rows.map(r => r.staff_id);

    console.log('🏢 Creating agencies...');
    
    for (let i = 0; i < agencies.length; i++) {
      const agency = agencies[i];
      const staffId = staffIds[i % staffIds.length]; // Phân bổ staff
      
      // Tạo agency
      const agencyResult = await client.query(
        `INSERT INTO master.agency 
         (code, name, address, phone, email, level, debt_limit, managed_by_staff_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING agency_id`,
        [agency.code, agency.name, agency.address, agency.phone, agency.email, 
         agency.level, agency.debtLimit, staffId]
      );
      
      const agencyId = agencyResult.rows[0].agency_id;
      
      // Tạo account cho agency
      const hashedPassword = await bcrypt.hash('123456', 10);
      const username = agency.code.toLowerCase();
      
      const accountResult = await client.query(
        `INSERT INTO auth.account 
         (code, username, password_hash, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'agency', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING account_id`,
        [agency.code, username, hashedPassword]
      );
      
      const accountId = accountResult.rows[0].account_id;
      
      // Tạo user record
      await client.query(
        `INSERT INTO auth."user" 
         (account_id, full_name, email, phone, agency_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [accountId, `Chủ ${agency.name}`, agency.email, agency.phone, agencyId]
      );
      
      // Tạo distributions (phiếu xuất) với payment tương ứng  
      const numDistributions = Math.floor(agency.totalPayments / 3500000); // Mỗi distribution khoảng 3.5 triệu
      const completedCount = Math.floor(numDistributions * (agency.completedPayments / agency.totalPayments));
      
      for (let j = 0; j < numDistributions; j++) {
        const distributionAmount = j < completedCount 
          ? Math.floor(agency.completedPayments / completedCount)
          : Math.floor(agency.pendingPayments / (numDistributions - completedCount));
        
        const paymentStatus = j < completedCount ? 'completed' : 'pending';
        const distributionStatus = j < completedCount ? 'delivered' : 'pending';
        
        // Tạo distribution
        const distributionDate = new Date();
        distributionDate.setDate(distributionDate.getDate() - (numDistributions - j) * 5); // Phân bổ theo thời gian
        
        const distributionResult = await client.query(
          `INSERT INTO ordermgmt.distribution 
           (distribution_code, agency_id, order_date, total_amount, status, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING distribution_id`,
          [`PX${agency.code}${String(j+1).padStart(3, '0')}`, agencyId, distributionDate, distributionAmount, 
           distributionStatus, accountId, distributionDate, distributionDate]
        );
        
        const distributionId = distributionResult.rows[0].distribution_id;
        
        // Tạo payment record trong finance.payment
        const paymentDate = new Date(distributionDate);
        paymentDate.setDate(paymentDate.getDate() + 2);
        
        await client.query(
          `INSERT INTO finance.payment 
           (code, agency_id, distribution_id, amount, status, payment_date, collected_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [`PT${agency.code}${String(j+1).padStart(3, '0')}`, agencyId, distributionId, distributionAmount, 
           paymentStatus, paymentDate, accountId, paymentDate, paymentDate]
        );
      }
      
      console.log(`✅ Created ${agency.name} (${agency.code}) - Level ${agency.level}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ All agency evaluation data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('- DL004: Cấp 3 -> Đủ điều kiện lên Cấp 2 (60 triệu)');
    console.log('- DL005: Cấp 3 -> Chưa đủ điều kiện (30 triệu)');
    console.log('- DL006: Cấp 2 -> Đủ điều kiện lên Cấp 1 (120 triệu)');
    console.log('- DL007: Cấp 2 -> Duy trì Cấp 2 (70 triệu)');
    console.log('- DL008: Cấp 2 -> Cần hạ xuống Cấp 3 (20 triệu)');
    console.log('- DL009: Cấp 1 -> Duy trì Cấp 1 (150 triệu)');
    console.log('- DL010: Cấp 1 -> Cần hạ xuống Cấp 2 (60 triệu)');
    console.log('- DL011: Cấp 3 -> Có công nợ (40 triệu completed, 15 triệu pending)');
    console.log('\n🔑 All accounts use password: 123456');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seed
seedAgencyEvaluationData()
  .then(() => {
    console.log('\n🎉 Seed process completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Seed process failed:', err);
    process.exit(1);
  });
