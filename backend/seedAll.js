import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import connectDB from "./db.js";
import User, { SEED_USERS } from './models/User.js';
import { InventoryItem, Location, Transaction, Donation, Request } from './models/Inventory.js';
import Emergency from './models/Emergency.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const INVENTORY_SEED_PATH = path.join(__dirname, 'data', 'inventory_seed');
const DATA_SEED_PATH = path.join(__dirname, 'data');

// **********************************************
// ********* UTILITY FUNCTIONS *****************
// **********************************************
const readJsonFile = (filename, basePath = DATA_SEED_PATH) => {
  const filePath = path.join(basePath, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Seed file not found: ${filePath}`);
    return [];
  }
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
};

const clearCollection = async (Model, collectionName) => {
  try {
    await Model.deleteMany({});
    console.log(`🗑️  Cleared ${collectionName} collection`);
  } catch (error) {
    console.error(`❌ Error clearing ${collectionName}:`, error.message);
  }
};

// **********************************************
// ********* USER SEEDING ***********************
// **********************************************
async function seedUsersData() {
  try {
    console.log("👤 Seeding users (Admin, Branch Manager, Volunteer, Refugee)...");
    
    // Clear existing users
    await clearCollection(User, 'users');
    
    let createdCount = 0;
    
    for (const userData of SEED_USERS) {
      await User.create(userData);
      console.log(`\t✅ Created user: ${userData.username} (${userData.role})`);
      createdCount++;
    }
    
    console.log(`✅ User seeding complete. Created: ${createdCount} users`);
  } catch (err) {
    console.error("❌ Error seeding user data:", err.message);
  }
}

// **********************************************
// ********* LOCATION SEEDING *******************
// **********************************************
async function seedLocationsData() {
  try {
    const locationCount = await Location.countDocuments();
    if (locationCount === 0) {
      console.log("📍 Seeding Locations...");
      const locationData = readJsonFile('locations_seed.json', INVENTORY_SEED_PATH);
      if (locationData.length > 0) {
        await Location.insertMany(locationData);
        console.log(`✅ Created ${locationData.length} locations`);
      }
    } else {
      console.log("ℹ️  Locations already exist, skipping...");
    }
  } catch (err) {
    console.error("❌ Error seeding location data:", err.message);
  }
}

// **********************************************
// ********* INVENTORY SEEDING ******************
// **********************************************
async function seedInventoryData() {
  try {
    const itemCount = await InventoryItem.countDocuments();
    if (itemCount === 0) {
      console.log("🌱 Seeding Inventory Items...");
      const inventoryData = readJsonFile('inventory_items_seed.json', INVENTORY_SEED_PATH);
      if (inventoryData.length > 0) {
        // Get location references
        const locations = await Location.find({});
        const locationMap = {};
        locations.forEach(loc => {
          locationMap[loc.name] = loc._id;
        });

        // Update inventory items with location ObjectIds
        const updatedInventoryData = inventoryData.map(item => ({
          ...item,
          location: locationMap[item.location] || locations[0]._id // Fallback to first location
        }));

        await InventoryItem.insertMany(updatedInventoryData);
        console.log(`✅ Created ${updatedInventoryData.length} inventory items`);
      }
    } else {
      console.log("ℹ️  Inventory items already exist, skipping...");
    }

    const transactionCount = await Transaction.countDocuments();
    if (transactionCount === 0) {
      console.log("📦 Seeding Transactions...");
      const transactionData = readJsonFile('transactions_seed.json', INVENTORY_SEED_PATH);
      if (transactionData.length > 0) {
        await Transaction.insertMany(transactionData);
        console.log(`✅ Created ${transactionData.length} transactions`);
      }
    } else {
      console.log("ℹ️  Transactions already exist, skipping...");
    }
  } catch (err) {
    console.error("❌ Error seeding inventory data:", err.message);
  }
}

// **********************************************
// ********* DONATIONS SEEDING ******************
// **********************************************
async function seedDonationsData() {
  try {
    const donationCount = await Donation.countDocuments();
    if (donationCount === 0) {
      console.log("🎁 Seeding Donations...");
      const donationData = readJsonFile('donations_seed.json');
      
      if (donationData.length > 0) {
        // Get volunteer user ID
        const volunteerUser = await User.findOne({ role: 'volunteer' });
        if (volunteerUser) {
          const updatedDonationData = donationData.map(donation => ({
            ...donation,
            volunteerId: volunteerUser._id,
            timestamp: new Date(donation.timestamp)
          }));

          await Donation.insertMany(updatedDonationData);
          console.log(`✅ Created ${updatedDonationData.length} donations`);
        } else {
          console.warn("⚠️  No volunteer user found, skipping donations");
        }
      }
    } else {
      console.log("ℹ️  Donations already exist, skipping...");
    }
  } catch (err) {
    console.error("❌ Error seeding donation data:", err.message);
  }
}

// **********************************************
// ********* REQUESTS SEEDING *******************
// **********************************************
async function seedRequestsData() {
  try {
    const requestCount = await Request.countDocuments();
    if (requestCount === 0) {
      console.log("📋 Seeding Requests...");
      const requestData = readJsonFile('requests_seed.json');
      
      if (requestData.length > 0) {
        // Get refugee user ID
        const citizenUser = await User.findOne({ role: 'refugee' });
        if (citizenUser) {
          const updatedRequestData = requestData.map(request => ({
            ...request,
            requesterId: citizenUser._id,
            timestamp: new Date(request.timestamp),
            fulfilledAt: request.fulfilledAt ? new Date(request.fulfilledAt) : undefined
          }));

          await Request.insertMany(updatedRequestData);
          console.log(`✅ Created ${updatedRequestData.length} requests`);
        } else {
          console.warn("⚠️  No refugee user found, skipping requests");
        }
      }
    } else {
      console.log("ℹ️  Requests already exist, skipping...");
    }
  } catch (err) {
    console.error("❌ Error seeding request data:", err.message);
  }
}

// **********************************************
// ********* EMERGENCY SEEDING ******************
// **********************************************
async function seedEmergencyData() {
  try {
    const emergencyCount = await Emergency.countDocuments();
    if (emergencyCount === 0) {
      console.log("🚨 Seeding Emergency Requests...");
      const emergencyData = readJsonFile('emergency_requests_seed.json');
      
      if (emergencyData.length > 0) {
        // Get refugee user ID
        const citizenUser = await User.findOne({ role: 'refugee' });
        if (citizenUser) {
          const updatedEmergencyData = emergencyData.map(emergency => ({
            ...emergency,
            userId: citizenUser._id,
            timeline: emergency.timeline.map(event => ({
              ...event,
              timestamp: new Date(event.timestamp)
            }))
          }));

          await Emergency.insertMany(updatedEmergencyData);
          console.log(`✅ Created ${updatedEmergencyData.length} emergency requests`);
        } else {
          console.warn("⚠️  No refugee user found, skipping emergencies");
        }
      }
    } else {
      console.log("ℹ️  Emergency requests already exist, skipping...");
    }
  } catch (err) {
    console.error("❌ Error seeding emergency data:", err.message);
  }
}

// **********************************************
// ********* MAIN SEEDING FUNCTION **************
// **********************************************
async function seedDatabase() {
  try {
    console.log("🌱 Starting comprehensive database seeding...");
    console.log("📍 Location: Punjab, India");
    console.log("⏰ Timestamp: Current system time");
    console.log("=" .repeat(50));
    
    await seedUsersData();
    await seedLocationsData();
    await seedInventoryData();
    await seedDonationsData();
    await seedRequestsData();
    await seedEmergencyData();
    
    console.log("=" .repeat(50));
    console.log("✅ Comprehensive database seeding completed successfully!");
    console.log("🎯 System ready for all user roles:");
    console.log("   - Admin: Full system access");
    console.log("   - Branch Manager: Regional operations");
    console.log("   - Volunteer: Donation management");
    console.log("   - Refugee: Request assistance");
  } catch (err) {
    console.error("❌ Database seeding failed:", err.message);
  } finally {
    process.exit(0);
  }
}

// **********************************************
// ********* RUN SEEDING ************************
// **********************************************
connectDB()
  .then(async () => {
    console.log("✅ Database connected successfully");
    await seedDatabase();
  })
  .catch((err) => {
    console.error("❌ Failed to connect to DB:", err.message);
    process.exit(1);
  });