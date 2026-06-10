const router = require('express').Router();
const {
  getMyRooms,
  getRoomById,
  getRoomByCode,
  getRoomMembers,
  getRoomActivity,
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

// All room routes require authentication
router.use(protect);

router.get('/',                      getMyRooms);
router.get('/code/:code',            getRoomByCode);
router.get('/:id',                   getRoomById);
router.get('/:id/members',           getRoomMembers);
router.get('/:id/activity',          getRoomActivity);

module.exports = router;
