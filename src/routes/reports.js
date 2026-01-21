const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.get('/summary/data', authMiddleware, reportController.getSummary);
router.get('/', authMiddleware, reportController.getAllReports);
router.get('/:id', authMiddleware, reportController.getReportById);
router.post('/', authMiddleware, reportController.createReport);
router.put('/:id', authMiddleware, reportController.updateReport);
router.delete('/:id', authMiddleware, reportController.deleteReport);

module.exports = router;
