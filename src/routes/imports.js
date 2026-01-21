const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all imports (role-based filtering)
router.get('/', importController.getAllImports);

// Get pending imports for admin approval
router.get('/pending/list', importController.getPendingImports);

// Get import by ID
router.get('/:id', importController.getImportById);

// Create new import (staff/admin only)
router.post('/', importController.createImport);

// Approve/Reject import (admin only)
router.put('/:id/approve', importController.approveImport);

// Confirm receipt (agency confirms received goods)
router.put('/:id/confirm', importController.confirmReceipt);

// Cancel import (staff/admin only)
router.put('/:id/cancel', importController.cancelImport);

module.exports = router;
