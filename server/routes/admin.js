const router = require('express').Router();
const {
  createRoom,
  listAllRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  addMember,
  removeMember,
  listAllUsers,
  getRoomActivity,
} = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');

// All admin routes: must be logged in AND be an admin
router.use(protect, requireRole('admin'));

// Users
router.get('/users', listAllUsers);

// Rooms
router.get('/rooms',          listAllRooms);
router.post('/rooms',         createRoom);
router.get('/rooms/:id',      getRoom);
router.patch('/rooms/:id',    updateRoom);
router.delete('/rooms/:id',   deleteRoom);

// Room members
router.post('/rooms/:id/members',            addMember);
router.delete('/rooms/:id/members/:userId',  removeMember);

// Room activity
router.get('/rooms/:id/activity', getRoomActivity);

module.exports = router;
