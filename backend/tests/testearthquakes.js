import mongoose from "mongoose";
import dotenv from "dotenv";
import Disaster from "../models/Disaster.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const earthquakes = await Disaster.find({ type: "earthquake" }).sort({ time: -1 }).limit(5);
  console.log(earthquakes);
  await mongoose.connection.close();
}

run();
