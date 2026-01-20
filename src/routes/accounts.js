const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const authMiddleware = require('../middleware/auth');

// GET all
router.get('/', authMiddleware, accountController.getAllAccounts);

// GET one
router.get('/:id', authMiddleware, accountController.getAccountById);

// POST create
router.post('/', authMiddleware, accountController.createAccount);

// PUT update
router.put('/:id', authMiddleware, accountController.updateAccount);

// DELETE
router.delete('/:id', authMiddleware, accountController.deleteAccount);

module.exports = router;
