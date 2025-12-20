import dotenv from "dotenv";
import connectDB from "./db.js";
import mongoose from "mongoose";
import { Location } from './models/Inventory.js';

dotenv.config();

/**
 * Migration script to fix location field in InventoryItem collection
 * Converts location strings to ObjectId references
 */
async function migrateInventoryLocations() {
    try {
        console.log("🔄 Starting inventory location migration...");

        // Get all locations
        const locations = await Location.find({});
        const locationMap = {};
        locations.forEach(loc => {
            locationMap[loc.name] = loc._id;
        });

        console.log(`📍 Found ${locations.length} locations in database`);

        // Use raw collection to avoid Mongoose schema validation errors during read
        const inventoryCollection = mongoose.connection.collection('inventoryitems');
        const allItems = await inventoryCollection.find({}).toArray();
        console.log(`📦 Found ${allItems.length} inventory items to check`);

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const item of allItems) {
            try {
                // Check if location is a string (needs migration)
                // Note: In raw BSON, ObjectId looks different from string.
                const isString = typeof item.location === 'string';

                if (isString) {
                    const locationId = locationMap[item.location];

                    if (locationId) {
                        // Update the item with ObjectId reference
                        await inventoryCollection.updateOne(
                            { _id: item._id },
                            { $set: { location: locationId } }
                        );
                        console.log(`✅ Updated item "${item.name}" - location: "${item.location}" -> ObjectId`);
                        updatedCount++;
                    } else {
                        console.warn(`⚠️  No matching location found for "${item.location}" in item "${item.name}"`);
                        // Use first location as fallback
                        if (locations.length > 0) {
                            await inventoryCollection.updateOne(
                                { _id: item._id },
                                { $set: { location: locations[0]._id } }
                            );
                            console.log(`✅ Updated item "${item.name}" with fallback location: "${locations[0].name}"`);
                            updatedCount++;
                        } else {
                            errorCount++;
                        }
                    }
                } else {
                    // Already an ObjectId (or at least not a string), skip
                    skippedCount++;
                }
            } catch (error) {
                console.error(`❌ Error updating item "${item.name}":`, error.message);
                errorCount++;
            }
        }

        console.log("\n" + "=".repeat(50));
        console.log("✅ Migration completed!");
        console.log(`   Updated: ${updatedCount} items`);
        console.log(`   Skipped: ${skippedCount} items`);
        console.log(`   Errors: ${errorCount} items`);
        console.log("=".repeat(50));

    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        process.exit(0);
    }
}

// Run migration
connectDB()
    .then(async () => {
        console.log("✅ Database connected successfully");
        await migrateInventoryLocations();
    })
    .catch((err) => {
        console.error("❌ Failed to connect to DB:", err.message);
        process.exit(1);
    });
