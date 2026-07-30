const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.post('/lookup', publicController.lookupStudent);
router.post('/send-otp', publicController.sendOtp);
router.post('/verify-otp', publicController.verifyOtp);
router.post('/initiate-payment', publicController.initiatePayment);
router.post('/paystack-webhook', publicController.paystackWebhook);
router.get('/payment-status', publicController.getPaymentStatus);
router.post('/verify-receipt', publicController.verifyReceipt);

module.exports = router;
// Force nodemon reload
