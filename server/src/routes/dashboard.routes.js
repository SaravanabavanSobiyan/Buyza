import { Router } from 'express';
import { protect, requirePermission } from '../middleware/auth.js';
import * as dashboard from '../controllers/dashboard.controller.js';

const router = Router();
router.use(protect, requirePermission('dashboard:read'));
router.get('/summary', dashboard.summary);
router.get('/sales-over-time', dashboard.salesOverTime);
router.get('/orders-by-status', dashboard.ordersByStatus);
router.get('/top-products', dashboard.topProducts);
router.get('/low-stock', dashboard.lowStock);

export default router;
