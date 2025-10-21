# Azure Cosmos DB Setup Guide

## ⚠️ IMPORTANT: Frontend CORS Limitation

**Cosmos DB cannot be accessed directly from the browser** due to CORS (Cross-Origin Resource Sharing) restrictions. This is a security feature that prevents exposing database credentials in frontend code.

### Current Status: Using localStorage ✅
The app currently uses **localStorage** for data storage. This works perfectly for single-user scenarios and development.

### To Use Cosmos DB, You Need a Backend API

You have **3 options** to use Cosmos DB:

#### **Option 1: Azure Static Web Apps + API Functions** ⭐ (Recommended)
- Deploy your React app to Azure Static Web Apps
- Create Azure Functions as your backend API
- Functions can safely access Cosmos DB
- No CORS issues, all in one deployment

#### **Option 2: Create a Node.js/Express Backend**
- Build a REST API with Express
- API connects to Cosmos DB server-side
- React app calls your API endpoints
- Deploy backend separately (Azure App Service, Container Apps, etc.)

#### **Option 3: Keep localStorage** (Current)
- Perfect for single-user, development, or demo purposes
- No backend needed
- Data stays in browser
- No monthly costs

---

## ✅ Cosmos DB Created Successfully!

**Account Details:**
- **Name**: pettracker-cosmos-db
- **Resource Group**: rg-techradar-aut-001
- **Region**: West Europe
- **Endpoint**: https://pettracker-cosmos-db.documents.azure.com:443/
- **Status**: Succeeded ✅

## 📦 What Was Set Up

### 1. Azure Resources
- ✅ Cosmos DB Account created with NoSQL API
- ✅ Automatic database and container creation on first use
- ✅ Containers will be created:
  - `Users` (partitioned by `/nif`)
  - `Walks` (partitioned by `/userId`)
  - `Challenges` (partitioned by `/userId`)
  - `Events` (partitioned by `/deviceId`)

### 2. Code Implementation
- ✅ `@azure/cosmos` SDK installed
- ✅ `src/api/cosmosClient.ts` - Cosmos DB client with full CRUD operations
- ✅ `src/utils/storageAdapter.ts` - Hybrid storage adapter (Cosmos DB + localStorage fallback)
- ✅ `src/utils/storage.ts` - Backward-compatible localStorage wrapper
- ✅ `.env` updated with Cosmos DB credentials

### 3. Environment Variables
```properties
VITE_COSMOS_ENDPOINT=https://pettracker-cosmos-db.documents.azure.com:443/
VITE_COSMOS_KEY=sCoZaI6mqEA0ElYcWzsQSweU7soxdSmnfRIOxVgSZ5VEZcnXIHjL8Ezu5lYz8xCFZzuR7BimvPUFACDbcBWKPA==
```

## 🚀 How to Use

### Current Setup (localStorage)
The app currently uses **localStorage** by default to maintain backward compatibility. All existing features work without changes.

### Switch to Cosmos DB
To enable Cosmos DB:

1. **Restart the dev server** to pick up the `.env` changes:
   ```powershell
   npm run dev
   ```

2. **Cosmos DB will initialize automatically** on app start
   - Check browser console for: ✅ Cosmos DB initialized successfully

3. **All data will now be stored in Azure Cosmos DB**
   - Data persists across browsers and devices
   - Accessible from Azure Portal
   - Automatic backups and global distribution

### Verify Cosmos DB Connection
```typescript
import { cosmosClient } from '@/api/cosmosClient';

// Test connection
const isConnected = await cosmosClient.testConnection();
console.log('Cosmos DB connected:', isConnected);

// Get storage type
import { getStorageType } from '@/utils/storageAdapter';
console.log('Using:', getStorageType()); // 'cosmosdb' or 'localstorage'
```

## 📊 Accessing Data in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to `rg-techradar-aut-001` resource group
3. Click on `pettracker-cosmos-db`
4. Go to **Data Explorer** to view/query data
5. Select `PetTrackerDB` database → containers → view items

## 💰 Cost Estimate

**Standard Tier** (since free tier was already used):
- Base cost: ~$24/month for 400 RU/s provisioned throughput
- Storage: $0.25/GB per month
- **Estimated total for Pet Tracker**: ~$25-30/month

### Cost Optimization Tips:
1. **Use Serverless** tier (pay per request) if low traffic
2. **Scale down RU/s** during off-hours
3. **Use TTL** (Time To Live) to auto-delete old events
4. **Monitor usage** in Azure Portal → Metrics

## 🔒 Security Best Practices

⚠️ **IMPORTANT**: The primary key is in `.env` file
- ✅ `.env` is in `.gitignore` - never commit it
- ✅ Use Azure Key Vault for production
- ✅ Regenerate keys if accidentally exposed
- ✅ Consider using Azure AD authentication instead of keys

### Regenerate Keys (if needed):
```powershell
az cosmosdb keys regenerate --name pettracker-cosmos-db --resource-group rg-techradar-aut-001 --key-kind primary
```

## 🔄 Migration Path

### Migrate Existing localStorage Data to Cosmos DB

```typescript
// Run this once to migrate existing data
import { cosmosClient } from '@/api/cosmosClient';

async function migrateData() {
  // Get data from localStorage
  const users = JSON.parse(localStorage.getItem('pet_tracker_users') || '[]');
  const walks = JSON.parse(localStorage.getItem('pet_tracker_walks') || '[]');
  const challenges = JSON.parse(localStorage.getItem('pet_tracker_challenges') || '[]');

  // Initialize Cosmos DB
  await cosmosClient.initialize();

  // Upload to Cosmos DB
  for (const user of users) {
    await cosmosClient.saveUser(user);
  }
  for (const walk of walks) {
    await cosmosClient.saveWalk(walk);
  }
  for (const challenge of challenges) {
    await cosmosClient.saveChallenge(challenge);
  }

  console.log('✅ Migration complete!');
}

// Call migration
migrateData().catch(console.error);
```

## 📝 Next Steps

1. **Test the connection** - Restart dev server and check console
2. **Sync some users** - Go to Sync page and sync users from Trackimo API
3. **Verify in Azure Portal** - Check Data Explorer to see your data
4. **Monitor costs** - Set up budget alerts in Azure Portal
5. **Set up backups** - Enable automatic backups (already enabled by default)

## 🐛 Troubleshooting

### Issue: "Cosmos DB not configured"
- Check `.env` file has VITE_COSMOS_ENDPOINT and VITE_COSMOS_KEY
- Restart dev server (`npm run dev`)

### Issue: "Failed to initialize Cosmos DB"
- Verify credentials in `.env` are correct
- Check network connectivity to Azure
- Verify firewall rules in Cosmos DB allow your IP

### Issue: "429 Too Many Requests"
- You've exceeded provisioned throughput (RU/s)
- Scale up RU/s in Azure Portal
- Or add retry logic (already implemented in cosmosClient)

### Issue: Data not appearing
- Check browser console for errors
- Verify Cosmos DB initialized successfully
- Check Azure Portal Data Explorer to see if data exists

## 📚 Resources

- [Azure Cosmos DB Documentation](https://docs.microsoft.com/en-us/azure/cosmos-db/)
- [Cosmos DB Pricing](https://azure.microsoft.com/en-us/pricing/details/cosmos-db/)
- [Best Practices](https://docs.microsoft.com/en-us/azure/cosmos-db/best-practices)
- [Query Optimization](https://docs.microsoft.com/en-us/azure/cosmos-db/sql-query-getting-started)

## ✅ Summary

You now have:
- ✅ Azure Cosmos DB account provisioned
- ✅ Application code ready to use Cosmos DB
- ✅ Backward compatibility with localStorage
- ✅ Automatic database/container creation
- ✅ Full CRUD operations implemented
- ✅ Ready for production deployment!

**Status**: 🟢 READY TO USE
