import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { seedShippingMethods } from "./shipping-methods.js";

async function seed() {
  await connectDB();
  await seedShippingMethods();
  console.log("Shipping methods seeded: Standard and Express.");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
