const express = require('express');
const router = express.Router();
const receiveController = require('../controllers/receiveController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get all receive orders
router.get('/', receiveController.getAllReceiveOrders);

// Get receive order by ID
router.get('/:id', receiveController.getReceiveOrderById);

// Create new receive order
router.post('/', receiveController.createReceiveOrder);

// Update receive order status
router.patch('/:id/status', receiveController.updateReceiveOrderStatus);

// Delete receive order
router.delete('/:id', receiveController.deleteReceiveOrder);

module.exports = router;
