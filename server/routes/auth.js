const router = require('express').Router();
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public
router.post('/register', register);
router.post('/login',    login);

// Protected
router.get('/me',                protect, getMe);
router.patch('/me',              protect, updateProfile);
router.patch('/me/password',     protect, changePassword);

module.exports = router;
