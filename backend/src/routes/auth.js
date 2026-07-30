const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

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

const forgotPasswordValidation = [
  body('indexNumber').notEmpty().withMessage('Index number is required'),
  body('phoneNumber').notEmpty().withMessage('Registered phone number is required')
];

const verifyOTPValidation = [
  body('identity').notEmpty().withMessage('Identity is required'),
  body('otp').matches(/^\d{6}$/).withMessage('Invalid OTP format')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

router.post('/login', loginValidation, authController.login);
// Student self-registration is DISABLED — students must be imported by an admin with import permissions.
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);
router.post('/verify-otp', verifyOTPValidation, authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);
router.post('/change-password', authenticate, changePasswordValidation, authController.changePassword);
router.get('/me', authenticate, authController.getMe);
router.post('/refresh', authenticate, authController.refreshToken);

module.exports = router;
