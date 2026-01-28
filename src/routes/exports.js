const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const exportController = require('../controllers/exportController');

// Get all exports
router.get('/', authMiddleware, exportController.getAllExports);

// Create export order (with inventory deduction)
router.post('/create', authMiddleware, exportController.createExportOrder);

module.exports = router;
