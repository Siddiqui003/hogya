const router = require('express').Router();
const {
  createRoom, listAllRooms, getRoom, updateRoom,
  toggleJoinable, deleteRoom, hardDeleteRoom,
  addMember, removeMember, listAllUsers, getRoomActivity,
} = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect, requireRole('admin'));

router.get('/users',                              listAllUsers);
router.get('/rooms',                              listAllRooms);
router.post('/rooms',                             createRoom);
router.get('/rooms/:id',                          getRoom);
router.patch('/rooms/:id',                        updateRoom);
router.patch('/rooms/:id/toggleJoinable',         toggleJoinable);
router.delete('/rooms/:id',                       deleteRoom);
router.delete('/rooms/:id/hard',                  hardDeleteRoom);
router.post('/rooms/:id/members',                 addMember);
router.delete('/rooms/:id/members/:userId',       removeMember);
router.get('/rooms/:id/activity',                 getRoomActivity);

module.exports = router;
