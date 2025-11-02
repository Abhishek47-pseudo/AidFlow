import mongoose from 'mongoose';

// 1. Inventory Item Schema
const inventoryItemSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ['Medical', 'Food', 'Shelter', 'Equipment', 'Water'] },
    currentStock: { type: Number, required: true, min: 0 },
    minThreshold: { type: Number, default: 0 },
    maxCapacity: { type: Number, default: 1000 },
    unit: { type: String, required: true },
    location: { type: String, required: true }, // Should eventually be a reference to a Location ID
    lastUpdated: { type: Date, default: Date.now },
    status: { type: String, required: true, enum: ['critical', 'low', 'adequate'] },
    cost: { type: Number, required: true, min: 0 },
    supplier: { type: String, required: true },
}, { timestamps: true });

// 2. Location Schema
const locationSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, required: true },
    // Capacity is hard to calculate dynamically; here we store the raw string from the mock. 
    // In a real app, this would be calculated or stored as max_volume.
    capacity: { type: String }, 
}, { timestamps: true });

// 3. Transaction Schema
const transactionSchema = new mongoose.Schema({
    type: { type: String, required: true, enum: ['inbound', 'outbound', 'request'] },
    item: { type: String, required: true }, // Should eventually be a reference to an Item ID
    quantity: { type: Number, required: true, min: 1 },
    source: { type: String, default: null }, // Used for inbound
    destination: { type: String, default: null }, // Used for outbound/request
    timestamp: { type: Date, default: Date.now },
    status: { type: String, required: true, enum: ['completed', 'in-transit', 'pending', 'cancelled'] },
    priority: { type: String, default: null }, // Used for 'request' type
}, { timestamps: true });


export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
export const Location = mongoose.model('Location', locationSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);

// 4. Donation Schema (For Volunteers)
const donationSchema = new mongoose.Schema({
    volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemName: { type: String, required: true },
    category: { type: String, required: true, enum: ['Medical', 'Food', 'Shelter', 'Equipment', 'Water'] },
    quantity: { type: Number, required: true, min: 1 },
    location: { type: String, required: true },
    status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected', 'received'] },
    approvedBy: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
  }, { timestamps: true });
  
  // 5. Request Schema (For Refugees/Recipients)
  const requestSchema = new mongoose.Schema({
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemName: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    location: { type: String, required: true },
    status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected', 'delivered'] },
    priority: { type: String, default: 'normal', enum: ['low', 'normal', 'high'] },
    timestamp: { type: Date, default: Date.now },
  }, { timestamps: true });
  
  export const Donation = mongoose.model('Donation', donationSchema);
  export const Request = mongoose.model('Request', requestSchema);
  

// The MOCK_DATA export has been removed to enforce the use of external JSON files.
