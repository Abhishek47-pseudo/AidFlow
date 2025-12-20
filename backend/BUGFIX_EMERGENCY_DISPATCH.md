# Emergency Dispatch System - Bug Fixes

## Issues Fixed

### 1. **EmergencyDecisionAgent: Cannot read properties of undefined (reading 'urgency')**

**Location:** `backend/services/emergencyDecisionAgent.js` line 255

**Root Cause:** 
The code was trying to access `bertAnalysis.sentiment.urgency` without checking if `bertAnalysis.sentiment` exists. When the BERT analysis doesn't include sentiment data, this causes a TypeError.

**Fix Applied:**
Added defensive null checks using optional chaining (`?.`) and default values:
```javascript
// Before
- Urgency: ${bertAnalysis.sentiment.urgency}
- Sentiment Score: ${bertAnalysis.sentiment.score}
- Keywords: ${bertAnalysis.sentiment.keywords.join(", ")}

// After
- Urgency: ${bertAnalysis?.sentiment?.urgency || 'medium'}
- Sentiment Score: ${bertAnalysis?.sentiment?.score || 0.5}
- Keywords: ${(bertAnalysis?.sentiment?.keywords || []).join(", ")}
```

### 2. **InventoryItem: Cast to ObjectId failed for location field**

**Location:** `backend/services/dispatchService.js` lines 175-195

**Root Cause:**
The `location` field in the InventoryItem schema is defined as an ObjectId reference to the Location model. However, when querying inventory items, the location field wasn't being populated, so accessing `item.location.name` failed. Additionally, some seed data had location stored as strings instead of ObjectIds.

**Fixes Applied:**

#### A. Added `.populate('location')` to all InventoryItem queries
```javascript
// Before
let availableItems = await InventoryItem.find({
    location: center.centerId,
    name: { $regex: resourceNameLower, $options: 'i' },
    currentStock: { $gt: 0 }
});

// After
let availableItems = await InventoryItem.find({
    location: center.centerId,
    name: { $regex: resourceNameLower, $options: 'i' },
    currentStock: { $gt: 0 }
}).populate('location'); // Populate location to access location.name
```

#### B. Updated locationName fallback logic
```javascript
// Before
locationName: item.location?.name || 'Unknown Location'

// After
locationName: item.location?.name || center.centerName || 'Unknown Location'
```

#### C. Created migration script
Created `backend/migrateInventoryLocations.js` to convert existing inventory items with string location values to ObjectId references.

## Files Modified

1. **backend/services/emergencyDecisionAgent.js**
   - Lines 249-260: Added null checks for bertAnalysis properties

2. **backend/services/dispatchService.js**
   - Lines 176, 184, 193: Added `.populate('location')` to queries
   - Line 224: Updated locationName fallback logic

3. **backend/migrateInventoryLocations.js** (NEW)
   - Migration script to fix existing data

## Testing Recommendations

1. **Test Emergency Request Flow:**
   ```bash
   POST /api/emergency/public-request
   {
     "lat": 30.7333,
     "lon": 76.7794,
     "message": "Urgent medical help needed",
     "address": "Test Location"
   }
   ```

2. **Test Dispatch Approval:**
   - Create an emergency request
   - Check dispatch requests: `GET /api/emergency/dispatch-requests`
   - Approve a dispatch: `PUT /api/emergency/dispatch-requests/:id/approve`

3. **Verify Inventory Queries:**
   - Check that inventory items have ObjectId locations
   - Verify location population works correctly

## Migration Steps

If you have existing data, run the migration:
```bash
cd backend
node migrateInventoryLocations.js
```

This will:
- Find all inventory items with string location values
- Convert them to ObjectId references
- Use location name mapping from the Location collection
- Provide a summary of updated/skipped/error items

## Prevention

To prevent similar issues in the future:

1. **Always use optional chaining** when accessing nested properties that might be undefined
2. **Always populate** ObjectId references when you need to access referenced document fields
3. **Validate seed data** to ensure ObjectId fields contain ObjectIds, not strings
4. **Add TypeScript** or JSDoc type annotations to catch these issues at development time
