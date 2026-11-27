import { Router } from 'express';
import { protect, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as admin from '../controllers/order.admin.controller.js';

const router = Router();

router.use(protect);

router.get('/', requirePermission('orders:read'), admin.list);
router.get('/:orderNumber', requirePermission('orders:read'), admin.detail);
router.get('/:orderNumber/invoice', requirePermission('orders:read'), admin.invoice);
router.get('/:orderNumber/packing-slip', requirePermission('orders:read'), admin.packingSlip);
router.patch('/:orderNumber/status', requirePermission('orders:update'), validate(admin.statusSchema), admin.updateStatus);
router.post('/:orderNumber/mark-paid', requirePermission('orders:mark_paid'), admin.markPaid);

export default router;
