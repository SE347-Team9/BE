const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, driverController.getAllDrivers);
router.get('/:id', authMiddleware, driverController.getDriverById);
router.post('/', authMiddleware, driverController.createDriver);
router.put('/:id', authMiddleware, driverController.updateDriver);
router.delete('/:id', authMiddleware, driverController.deleteDriver);

module.exports = router;
