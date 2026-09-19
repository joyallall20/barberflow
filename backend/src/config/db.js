import mongoose from "mongoose";
import User from "../models/User.js";
import Barber from "../models/Barber.js";

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined");
    }

    const connection = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${connection.connection.host}`);

    // Ensure database-level unique & sparse indexes are synced safely
    try {
      await Promise.all([
        User.syncIndexes(),
        Barber.syncIndexes(),
      ]);
      console.log("Database unique indexes synchronized successfully");
    } catch (indexError) {
      console.warn("Index synchronization warning:", indexError.message);
    }
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;