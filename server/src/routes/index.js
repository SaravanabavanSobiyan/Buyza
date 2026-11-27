import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import addressRoutes from "./address.routes.js";
import categoryRoutes from "./category.routes.js";
import brandRoutes from "./brand.routes.js";
import adminRoutes from "./admin.routes.js";
import productRoutes from "./product.routes.js";
import homeRoutes from "./home.routes.js";
import cartRoutes from "./cart.routes.js";
import wishlistRoutes from "./wishlist.routes.js";
import checkoutRoutes from "./checkout.routes.js";
import orderRoutes from "./order.routes.js";
import reviewRoutes from "./review.routes.js";
import contactRoutes from "./contact.routes.js";
import orderAdminRoutes from "./order.admin.routes.js";
import adminCustomerRoutes from "./customer.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ success: true, status: "ok", time: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/addresses", addressRoutes);
router.use("/categories", categoryRoutes);
router.use("/brands", brandRoutes);
router.use("/products/:productId/reviews", reviewRoutes);
router.use("/products", productRoutes);
router.use("/home", homeRoutes);
router.use("/cart", cartRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/orders", orderRoutes);
router.use("/contact", contactRoutes);
router.use("/admin/orders", orderAdminRoutes);
router.use("/admin/customers", adminCustomerRoutes);
router.use("/admin/dashboard", dashboardRoutes);
router.use("/admin", adminRoutes);

export default router;
