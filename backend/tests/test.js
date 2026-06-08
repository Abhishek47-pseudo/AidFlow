// testInsert.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Disaster from "../models/Disaster.js";

dotenv.config();

async function run() {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // 2. Insert a test disaster
    const doc = await Disaster.create({
      type: "test",
      place: "Delhi",
      magnitude: 5,
      coords: [77.2, 28.6],
      time: new Date(),
    });

    console.log("Inserted test disaster:", doc);

    // 3. Close connection
    await mongoose.connection.close();
    console.log("✅ Connection closed");
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

run();
