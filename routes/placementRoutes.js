const express = require('express');
const router = express.Router();
const { searchStudent, updatePlacementDetails } = require('../controllers/placementController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/students/search', protect, authorize('placement_officer', 'admin'), searchStudent);
router.put('/students/:usn', protect, authorize('placement_officer', 'admin'), updatePlacementDetails);

module.exports = router;
