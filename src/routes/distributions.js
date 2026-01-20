const express = require('express');
const router = express.Router();
const distributionController = require('../controllers/distributionController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all distributions (role-based filtering)
router.get('/', distributionController.getAllDistributions);

// Get distribution by ID
router.get('/:id', distributionController.getDistributionById);

// Create new distribution
router.post('/', distributionController.createDistribution);

// Update distribution status (staff/admin only)
router.put('/:id/status', distributionController.updateDistributionStatus);

// Approve distribution (staff/admin only)
router.put('/:id/approve', distributionController.approveDistribution);

// Cancel distribution
router.put('/:id/cancel', distributionController.cancelDistribution);

module.exports = router;
