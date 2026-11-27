import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import Category from "../src/models/Category.js";
import Brand from "../src/models/Brand.js";
import Product from "../src/models/Product.js";
import { password as passwordSchema } from "../src/validators/auth.validators.js";
import { seedShippingMethods } from "./shipping-methods.js";

// Prices are in minor units (x100): 1290000 = LKR 12,900.00
async function seed() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (!adminEmail || adminPassword.length < 12 || !passwordSchema.safeParse(adminPassword).success) {
    throw new Error("Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 12 characters before seeding.");
  }

  await connectDB();

  // Resets catalog data. Your registered users are kept (only the admin is recreated).
  await Promise.all([Category.deleteMany({}), Brand.deleteMany({}), Product.deleteMany({})]);

  await User.deleteOne({ email: adminEmail });
  await User.create({
    name: "Admin",
    email: adminEmail,
    password: adminPassword,
    role: "admin",
    isVerified: true,
  });

  const [electronics, fashion, home] = await Category.create([
    { name: "Electronics", sortOrder: 1 },
    { name: "Fashion", sortOrder: 2 },
    { name: "Home & Living", sortOrder: 3 },
  ]);
  const [audio] = await Category.create([{ name: "Audio", parent: electronics._id }]);

  const [soundmax, timetech, basics, homeco] = await Brand.create([
    { name: "SoundMax" },
    { name: "TimeTech" },
    { name: "Basics" },
    { name: "HomeCo" },
  ]);

  await Product.create([
    { name: "Wireless Headphones", sku: "HP-001", price: 1290000, stock: 25, brand: soundmax._id, category: audio._id, isFeatured: true, tags: ["audio", "wireless"], description: "Over-ear Bluetooth headphones." },
    { name: "Smart Watch", sku: "SW-001", price: 1890000, salePrice: 1590000, stock: 15, brand: timetech._id, category: electronics._id, isFeatured: true, tags: ["wearable"], description: "Fitness tracking smart watch." },
    {
      name: "Cotton T-Shirt",
      price: 249000,
      brand: basics._id,
      category: fashion._id,
      tags: ["shirt"],
      description: "Soft everyday tee.",
      variants: [
        { sku: "TS-S-BLK", attributes: { Size: "S", Color: "Black" }, stock: 30 },
        { sku: "TS-M-BLK", attributes: { Size: "M", Color: "Black" }, stock: 40 },
        { sku: "TS-L-BLK", attributes: { Size: "L", Color: "Black" }, stock: 3 },
      ],
    },
    { name: "Ceramic Mug Set", sku: "MG-004", price: 320000, stock: 0, brand: homeco._id, category: home._id, tags: ["kitchen"], description: "Set of 4 ceramic mugs." },
  ]);

  await seedShippingMethods();

  console.log("Seed complete. Admin:", adminEmail);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
