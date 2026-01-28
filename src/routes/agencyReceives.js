const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const agencyReceiveController = require('../controllers/agencyReceiveController');

// All routes require authentication
router.use(authMiddleware);

// List agency receives
router.get('/', agencyReceiveController.getAgencyReceives);

// Confirm a receive (by distribution_id)
router.patch('/:id/confirm', agencyReceiveController.confirmAgencyReceive);

// Update distribution status to pending (for staff)
router.patch('/:id/update-to-pending', agencyReceiveController.updateStatusToPending);

module.exports = router;
