const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

/**
 * @route   GET /api/users/:userId
 * @desc    الحصول على بيانات مستخدم
 * @access  Private
 */
router.get('/:userId', authenticate, userController.getUser);

/**
 * @route   PUT /api/users/:userId
 * @desc    تحديث بيانات مستخدم
 * @access  Private
 */
router.put('/:userId', authenticate, userController.updateUser);

/**
 * @route   GET /api/users/:userId/favorites
 * @desc    الحصول على مفضلة المستخدم
 * @access  Private
 */
router.get('/:userId/favorites', authenticate, userController.getFavorites);

/**
 * @route   POST /api/users/:userId/favorites
 * @desc    إضافة إلى المفضلة
 * @access  Private
 */
router.post('/:userId/favorites', authenticate, userController.addToFavorites);

/**
 * @route   DELETE /api/users/:userId/favorites/:itemId
 * @desc    إزالة من المفضلة
 * @access  Private
 */
router.delete('/:userId/favorites/:itemId', authenticate, userController.removeFromFavorites);

/**
 * @route   GET /api/users
 * @desc    الحصول على قائمة المستخدمين (للمشرف)
 * @access  Private (Admin)
 */
router.get('/', authenticate, requireAdmin, userController.getAllUsers);

module.exports = router;