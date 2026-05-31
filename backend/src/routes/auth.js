const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

const strongPassword = (fieldName = 'password') =>
  body(fieldName)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must include at least one letter')
    .matches(/[0-9]/)
    .withMessage('Password must include at least one number');

// Validation middleware - accept either email or indexNumber
const loginValidation = [
  body('password').notEmpty().withMessage('Password is required'),
  body().custom((value) => {
    if (!value.email && !value.indexNumber) {
      throw new Error('Either email or index number is required');
    }
    if (value.email && !value.email.includes('@')) {
      throw new Error('Invalid email format');
    }
    return true;
  })
];

const registerValidation = [
  body('indexNumber').trim().notEmpty().withMessage('Index number is required'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  strongPassword('password')
];

const forgotPasswordValidation = [
  body().custom((value) => {
    if (!value.indexNumber && !value.phoneNumber) {
      throw new Error('Index number or Phone number is required');
    }
    return true;
  })
];

const verifyOTPValidation = [
  body('identity').trim().notEmpty().withMessage('Identity is required'),
  body('otp').trim().isLength({ min: 4, max: 6 }).withMessage('Invalid OTP format')
];

const resetPasswordValidation = [
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  strongPassword('newPassword')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  strongPassword('newPassword')
];

// Routes
router.post('/login', loginValidation, authController.login);
router.post('/register', registerValidation, authController.register);
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);
router.post('/verify-otp', verifyOTPValidation, authController.verifyOTP);
router.post('/reset-password', resetPasswordValidation, authController.resetPassword);
router.post('/change-password', authenticate, changePasswordValidation, authController.changePassword);
router.get('/me', authenticate, authController.getMe);
router.post('/refresh', authenticate, authController.refreshToken);

module.exports = router;
