const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAPIs() {
  try {
    console.log('\n========== KIỂM TRA API ENDPOINTS ==========\n');

    // Test agencies
    console.log('📍 Testing /api/agencies');
    try {
      const agencies = await axios.get(`${API_BASE}/agencies`);
      console.log('  ✅ Response status:', agencies.status);
      console.log('  ✅ Data count:', agencies.data.data?.length || agencies.data?.length || 0);
      console.log('  Sample:', JSON.stringify(agencies.data.data?.[0] || agencies.data?.[0], null, 2));
    } catch (err) {
      console.log('  ❌ Error:', err.response?.status, err.message);
    }

    // Test exports
    console.log('\n📦 Testing /api/distributions');
    try {
      const exports = await axios.get(`${API_BASE}/distributions`);
      console.log('  ✅ Response status:', exports.status);
      console.log('  ✅ Data count:', exports.data.data?.length || exports.data?.length || 0);
      console.log('  Sample:', JSON.stringify(exports.data.data?.[0] || exports.data?.[0], null, 2));
    } catch (err) {
      console.log('  ❌ Error:', err.response?.status, err.message);
    }

    // Test receive orders
    console.log('\n📥 Testing /api/receive-orders');
    try {
      const receives = await axios.get(`${API_BASE}/receive-orders`);
      console.log('  ✅ Response status:', receives.status);
      console.log('  ✅ Data count:', receives.data.data?.length || receives.data?.length || 0);
      console.log('  Sample:', JSON.stringify(receives.data.data?.[0] || receives.data?.[0], null, 2));
    } catch (err) {
      console.log('  ❌ Error:', err.response?.status, err.message);
    }

    // Test payments
    console.log('\n💰 Testing /api/payments');
    try {
      const payments = await axios.get(`${API_BASE}/payments`);
      console.log('  ✅ Response status:', payments.status);
      console.log('  ✅ Data count:', payments.data.data?.length || payments.data?.length || 0);
      console.log('  Sample:', JSON.stringify(payments.data.data?.[0] || payments.data?.[0], null, 2));
    } catch (err) {
      console.log('  ❌ Error:', err.response?.status, err.message);
    }

    console.log('\n✅ Kiểm tra API xong\n');
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

testAPIs();
