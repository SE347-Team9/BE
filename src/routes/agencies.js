const express = require('express');
const router = express.Router();
const agencyController = require('../controllers/agencyController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, agencyController.getAllAgencies);
router.get('/:id', authMiddleware, agencyController.getAgencyById);
router.post('/', authMiddleware, agencyController.createAgency);
router.put('/:id', authMiddleware, agencyController.updateAgency);
router.delete('/:id', authMiddleware, agencyController.deleteAgency);

module.exports = router;
