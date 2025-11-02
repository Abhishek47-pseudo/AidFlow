import express from "express";
import fetch from "node-fetch";
import mongoose from "mongoose";
import cors from "cors";
import csv from "csvtojson";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { Donation, Request } from './models/Inventory.js';

// --- MODEL & UTILITY IMPORTS ---
import User, { SEED_USERS } from './models/User.js';
import Disaster from "./models/Disaster.js";
import { InventoryItem, Location, Transaction } from './models/Inventory.js';
import connectDB from "./db.js";
import generateToken from './utils/tokenGenerator.js';
// -----------------------------

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ----------------- CONFIGURATION -----------------
const CSV_FILE_PATH = path.join(__dirname, 'data', 'predictions_with_coords.csv');
const INVENTORY_SEED_PATH = path.join(__dirname, 'data', 'inventory_seed');

const THRESHOLD = 0.5;
const PLACEHOLDER_TIMESTAMP = "2024-01-01T00:00:00Z";
const PRESENCE_KEYS = [
  'bridges_any', 'buildings_any', 'roads_any', 'trees_any', 'water_any'
];

// **********************************************
// ********* USER SEEDING ***********************
// **********************************************
async function seedUsersData() {
  try {
    const userCount = await User.countDocuments();
    if (userCount < 2) {
      console.log("👤 Seeding initial Admin and Volunteer users...");
      for (const userData of SEED_USERS) {
        const userExists = await User.findOne({ username: userData.username });
        if (!userExists) {
          await User.create(userData);
          console.log(`\t-> Created user: ${userData.username} (${userData.role})`);
        }
      }
      console.log("✅ User seeding complete.");
    }
  } catch (err) {
    console.error("❌ Error seeding user data:", err.message);
  }
}

// **********************************************
// ********* USER AUTHENTICATION APIS ***********
// **********************************************

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, firstName, lastName, country, state, city, address, companyType, occupation, volunteerSkills } = req.body;
    const userExists = await User.findOne({ username });

    if (userExists) {
      return res.status(400).json({ message: "User already exists with this username." });
    }

    const user = await User.create({
      username,
      password,
      firstName,
      lastName,
      country,
      state,
      city,
      address,
      companyType,
      occupation,
      volunteerSkills: volunteerSkills || [],
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        role: user.role,
        message: "Registration successful!",
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(400).json({ message: "Invalid user data received." });
    }

  } catch (err) {
    const errors = Object.values(err.errors || {}).map(e => e.message).join('; ');
    console.error("❌ Registration Error:", err.message);
    res.status(500).json({ message: errors || "Server error during registration." });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (err) {
    console.error("❌ Login Error:", err.message);
    res.status(500).json({ message: "Server error during login." });
  }
});

// **********************************************
// ********** INVENTORY MANAGEMENT APIS *********
// **********************************************

const readJsonFile = (filename) => {
  const filePath = path.join(INVENTORY_SEED_PATH, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Seed file not found: ${filePath}`);
    return [];
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
};

async function seedInventoryData() {
  try {
    const itemCount = await InventoryItem.countDocuments();
    if (itemCount === 0) {
      console.log("🌱 Seeding Inventory Items...");
      const inventoryData = readJsonFile('inventory_items_seed.json');
      if (inventoryData.length > 0) {
        await InventoryItem.insertMany(inventoryData);
      }
    }

    const locationCount = await Location.countDocuments();
    if (locationCount === 0) {
      console.log("📍 Seeding Locations...");
      const locationData = readJsonFile('locations_seed.json');
      if (locationData.length > 0) {
        await Location.insertMany(locationData);
      }
    }

    const transactionCount = await Transaction.countDocuments();
    if (transactionCount === 0) {
      console.log("📦 Seeding Transactions...");
      const transactionData = readJsonFile('transactions_seed.json');
      if (transactionData.length > 0) {
        await Transaction.insertMany(transactionData);
      }
    }

    console.log("✅ Inventory data seeding complete.");
  } catch (err) {
    console.error("❌ Error seeding inventory data:", err.message);
  }
}

// GET /api/inventory/items
app.get("/api/inventory/items", async (req, res) => {
  try {
    const items = await InventoryItem.find({});
    const formattedItems = items.map(item => ({
      ...item._doc,
      id: item._id,
      lastUpdated: `${Math.floor(Math.random() * 5) + 1} hours ago`,
    }));
    res.json(formattedItems);
  } catch (err) {
    console.error("❌ Error fetching inventory items:", err.message);
    res.status(500).json({ error: "Failed to fetch inventory items." });
  }
});
// Volunteer donates an item
app.post("/api/volunteer/donate", async (req, res) => {
    try {
      const { volunteerId, itemName, category, quantity, location } = req.body;
      const donation = await Donation.create({ volunteerId, itemName, category, quantity, location });
      res.status(201).json({ message: "Donation submitted!", donation });
    } catch (err) {
      console.error("❌ Donation Error:", err.message);
      res.status(500).json({ error: "Failed to submit donation." });
    }
  });
  
  // Fetch all donations for this volunteer
  app.get("/api/volunteer/donations/:volunteerId", async (req, res) => {
    try {
      const { volunteerId } = req.params;
      const donations = await Donation.find({ volunteerId }).sort({ createdAt: -1 });
      res.json(donations);
    } catch (err) {
      console.error("❌ Error fetching donations:", err.message);
      res.status(500).json({ error: "Failed to fetch donations." });
    }
  });
  // Request items
app.post("/api/requester/request", async (req, res) => {
    try {
      const { requesterId, itemName, category, quantity, location, priority } = req.body;
      const request = await Request.create({ requesterId, itemName, category, quantity, location, priority });
      res.status(201).json({ message: "Request submitted!", request });
    } catch (err) {
      console.error("❌ Request Error:", err.message);
      res.status(500).json({ error: "Failed to submit request." });
    }
  });
  
  // Fetch all requests for this user
  app.get("/api/requester/requests/:requesterId", async (req, res) => {
    try {
      const { requesterId } = req.params;
      const requests = await Request.find({ requesterId }).sort({ createdAt: -1 });
      res.json(requests);
    } catch (err) {
      console.error("❌ Error fetching requests:", err.message);
      res.status(500).json({ error: "Failed to fetch requests." });
    }
  });
// Approve or reject a donation
app.put("/api/admin/donation/:id", async (req, res) => {
    try {
      const { status, approvedBy } = req.body;
      const donation = await Donation.findByIdAndUpdate(
        req.params.id,
        { status, approvedBy },
        { new: true }
      );
  
      // If approved, update inventory count
      if (status === "approved") {
        const existingItem = await InventoryItem.findOne({ name: donation.itemName });
        if (existingItem) {
          existingItem.currentStock += donation.quantity;
          existingItem.save();
        }
      }
  
      res.json({ message: "Donation status updated.", donation });
    } catch (err) {
      console.error("❌ Admin Donation Update Error:", err.message);
      res.status(500).json({ error: "Failed to update donation status." });
    }
  });
  
  // Approve or reject a request
  app.put("/api/admin/request/:id", async (req, res) => {
    try {
      const { status } = req.body;
      const request = await Request.findByIdAndUpdate(req.params.id, { status }, { new: true });
  
      // If approved/delivered, deduct from inventory
      if (status === "delivered" || status === "approved") {
        const item = await InventoryItem.findOne({ name: request.itemName });
        if (item && item.currentStock >= request.quantity) {
          item.currentStock -= request.quantity;
          item.save();
        }
      }
  
      res.json({ message: "Request status updated.", request });
    } catch (err) {
      console.error("❌ Admin Request Update Error:", err.message);
      res.status(500).json({ error: "Failed to update request status." });
    }
  });
    

// **********************************************
// ********* DISASTER PREDICTIONS API ***********
// **********************************************
app.get("/api/disaster-predictions", async (req, res) => {
  console.log("📈 /api/disaster-predictions endpoint hit");
  try {
    if (!fs.existsSync(CSV_FILE_PATH)) {
      return res.status(404).json({
        error: "Disaster prediction data file not found on server.",
      });
    }

    const jsonArray = await csv().fromFile(CSV_FILE_PATH);

    const disasterData = jsonArray
      .map(row => {
        const prediction_data = {};
        const predicted_labels = [];
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.lon);
        let isDisasterPredicted = false;

        if (isNaN(lat) || isNaN(lon)) return null;

        for (const key in row) {
          if (['lat', 'lon', 'image_path', 'row'].includes(key)) continue;
          const prob = parseFloat(row[key]);
          if (!isNaN(prob)) {
            prediction_data[key] = prob;
            if (prob >= THRESHOLD && !PRESENCE_KEYS.includes(key)) {
              predicted_labels.push(key);
              isDisasterPredicted = true;
            }
          }
        }

        return isDisasterPredicted
          ? {
              latitude: lat,
              longitude: lon,
              timestamp: PLACEHOLDER_TIMESTAMP,
              predicted_labels,
              prediction_data,
            }
          : null;
      })
      .filter(Boolean);

    console.log(`📦 Returning ${disasterData.length} records.`);
    res.json(disasterData);
  } catch (err) {
    console.error("❌ Error processing predictions:", err.message);
    res.status(500).json({ error: "Failed to process disaster prediction data." });
  }
});

// **********************************************
// ************* SERVE FRONTEND *****************
// **********************************************
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")));
  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname, "../frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running...");
  });
}

// **********************************************
// ************ CONNECT & START *****************
// **********************************************
connectDB()
  .then(async () => {
    console.log("✅ Database connected successfully");
    await seedUsersData();
    await seedInventoryData();
    app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
  })
  .catch((err) => {
    console.error("❌ Failed to connect to DB:", err.message);
    process.exit(1);
  });
