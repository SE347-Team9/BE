const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all payments (role-based filtering)
router.get('/', paymentController.getAllPayments);

// Get agency debt info
router.get('/debt-info', paymentController.getDebtInfo);
router.get('/debt-info/:agencyId', paymentController.getDebtInfo);

// Get payment by ID
router.get('/:id', paymentController.getPaymentById);

// Create new payment
router.post('/', paymentController.createPayment);

// Confirm payment (staff/admin only)
router.put('/:id/confirm', paymentController.confirmPayment);

// Cancel payment
router.put('/:id/cancel', paymentController.cancelPayment);

module.exports = router;
