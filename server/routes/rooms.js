const router = require('express').Router();
const {
  getMyRooms, getRoomById, getRoomByCode,
  joinRoom, leaveRoom, getRoomMembers, getRoomActivity,
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',                getMyRooms);
router.post('/join',           joinRoom);
router.get('/code/:code',      getRoomByCode);
router.get('/:id',             getRoomById);
router.post('/:id/leave',      leaveRoom);
router.get('/:id/members',     getRoomMembers);
router.get('/:id/activity',    getRoomActivity);

module.exports = router;
