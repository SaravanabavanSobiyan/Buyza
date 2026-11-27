import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  if (!env.mongoUri) throw new Error("MONGO_URI is missing in .env");
  mongoose.set("strictQuery", true);
  const conn = await mongoose.connect(env.mongoUri);
  console.log(`MongoDB connected: ${conn.connection.host}`);
}
