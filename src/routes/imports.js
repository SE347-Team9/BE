const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all imports (role-based filtering)
router.get('/', importController.getAllImports);

// Get import by ID
router.get('/:id', importController.getImportById);

// Create new import (staff/admin only)
router.post('/', importController.createImport);

// Confirm receipt (agency confirms received goods)
router.put('/:id/confirm', importController.confirmReceipt);

// Cancel import (staff/admin only)
router.put('/:id/cancel', importController.cancelImport);

module.exports = router;
