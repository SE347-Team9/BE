const express = require('express');
const router = express.Router();
const regulationController = require('../controllers/regulationController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, regulationController.getAllRegulations);
router.get('/:id', authMiddleware, regulationController.getRegulationById);
router.post('/', authMiddleware, regulationController.createRegulation);
router.put('/:id', authMiddleware, regulationController.updateRegulation);
router.delete('/:id', authMiddleware, regulationController.deleteRegulation);

module.exports = router;
