import { Router } from 'express';
import express from 'express';
import { paystackWebhook } from './paystack.webhook.js';

const router = Router();

// IMPORTANT: raw body required for Paystack signature verification.
// This route must use express.raw() NOT express.json().
router.post('/paystack', express.raw({ type: 'application/json' }), paystackWebhook);

export default router;
