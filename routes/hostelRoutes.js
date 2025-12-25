const express = require('express');
const router = express.Router();
const { searchStudent, updateHostelDetails } = require('../controllers/hostelController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/students/search', protect, authorize('hostel_manager', 'admin'), searchStudent);
router.put('/students/:usn', protect, authorize('hostel_manager', 'admin'), updateHostelDetails);

module.exports = router;
