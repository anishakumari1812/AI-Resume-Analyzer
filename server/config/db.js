import mongoose from "mongoose";

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("MongoDB connection skipped: MONGODB_URI is not configured.");
    return false;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
    return true;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    console.error(
      "The API will remain available, but login, saved analyses, and history will not work until MongoDB is reachable."
    );
    return false;
  }
};

export default connectDB;
