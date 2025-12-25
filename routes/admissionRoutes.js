const express = require('express');
const router = express.Router();
const { searchStudent, updateAdmissionDetails } = require('../controllers/admissionController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/students/search', protect, authorize('admission_officer', 'admin'), searchStudent);
router.put('/students/:usn', protect, authorize('admission_officer', 'admin'), updateAdmissionDetails);

module.exports = router;
