import express from 'express';

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Program routes are working',
    timestamp: new Date().toISOString()
  });
});

export default router;