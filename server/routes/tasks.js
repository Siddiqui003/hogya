const router = require('express').Router();
const {
  completeTask,
  reopenTask,
  getMyStatus,
  getAllStatuses,
  resetAllStatuses,
} = require('../controllers/taskController');
const { protect, requireRole } = require('../middleware/auth');

// All task routes require authentication
router.use(protect);

// Per-room task actions
router.post('/:roomId/complete',      completeTask);
router.post('/:roomId/reopen',        reopenTask);
router.get('/:roomId/status',         getMyStatus);
router.get('/:roomId/all-statuses',   getAllStatuses);

// Admin only: reset an entire room's completion state
router.post('/:roomId/reset', requireRole('admin'), resetAllStatuses);

module.exports = router;
