const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/auth');

// GET inventory overview
router.get('/overview', authMiddleware, inventoryController.getInventoryOverview);

module.exports = router;
