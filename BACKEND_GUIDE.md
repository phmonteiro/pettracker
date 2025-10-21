# Adding Backend API for Cosmos DB

## Why You Need a Backend

Cosmos DB cannot be accessed directly from the browser due to:
1. **CORS restrictions** - Browsers block cross-origin requests to database endpoints
2. **Security** - Database credentials would be exposed in frontend code
3. **Best practices** - Database operations should happen server-side

## Option 1: Azure Functions (Serverless) ⭐ Recommended

### Quick Setup:
```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Create Functions app
cd PetTracker
mkdir api
cd api
func init --typescript
func new --name GetUsers --template "HTTP trigger"
func new --name SaveUser --template "HTTP trigger"
func new --name GetWalks --template "HTTP trigger"
```

### Example Function (api/GetUsers/index.ts):
```typescript
import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const client = new CosmosClient({
        endpoint: process.env.COSMOS_ENDPOINT,
        key: process.env.COSMOS_KEY
    });
    
    const database = client.database("PetTrackerDB");
    const container = database.container("Users");
    
    const { resources: users } = await container.items.readAll().fetchAll();
    
    context.res = {
        status: 200,
        body: users,
        headers: {
            'Content-Type': 'application/json'
        }
    };
};

export default httpTrigger;
```

### Update Frontend:
```typescript
// Instead of:
import { cosmosClient } from './api/cosmosClient';
const users = await cosmosClient.getAllUsers();

// Use:
const response = await fetch('/api/GetUsers');
const users = await response.json();
```

### Deploy:
```bash
# Create Function App in Azure
az functionapp create --name pettracker-api \
  --resource-group rg-techradar-aut-001 \
  --consumption-plan-location westeurope \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4

# Deploy
cd api
func azure functionapp publish pettracker-api
```

---

## Option 2: Express.js Backend

### Quick Setup:
```bash
# Create backend folder
mkdir backend
cd backend
npm init -y
npm install express @azure/cosmos cors dotenv
npm install -D typescript @types/express @types/node ts-node

# Create server
```

### Example Server (backend/src/server.ts):
```typescript
import express from 'express';
import cors from 'cors';
import { CosmosClient } from '@azure/cosmos';

const app = express();
app.use(cors());
app.use(express.json());

const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT!,
    key: process.env.COSMOS_KEY!
});

const db = client.database('PetTrackerDB');

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const container = db.container('Users');
        const { resources } = await container.items.readAll().fetchAll();
        res.json(resources);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save user
app.post('/api/users', async (req, res) => {
    try {
        const container = db.container('Users');
        const { resource } = await container.items.create(req.body);
        res.json(resource);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get walks
app.get('/api/walks', async (req, res) => {
    try {
        const container = db.container('Walks');
        const { resources } = await container.items.readAll().fetchAll();
        res.json(resources);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});
```

### Deploy to Azure App Service:
```bash
az webapp create --name pettracker-api \
  --resource-group rg-techradar-aut-001 \
  --plan pettracker-plan \
  --runtime "NODE:18-lts"

# Configure environment variables
az webapp config appsettings set \
  --name pettracker-api \
  --resource-group rg-techradar-aut-001 \
  --settings \
    COSMOS_ENDPOINT="https://pettracker-cosmos-db.documents.azure.com:443/" \
    COSMOS_KEY="your-key-here"

# Deploy
cd backend
zip -r deploy.zip .
az webapp deployment source config-zip \
  --resource-group rg-techradar-aut-001 \
  --name pettracker-api \
  --src deploy.zip
```

---

## Option 3: Azure Static Web Apps (Best Integration)

### Setup:
```bash
# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Initialize
swa init

# Run locally (frontend + API together)
swa start http://localhost:3001 --api-location ./api
```

### Deploy:
```bash
# Build frontend
npm run build

# Deploy everything (frontend + API)
swa deploy --app-location ./dist --api-location ./api
```

### Benefits:
- ✅ Automatic CORS handling
- ✅ Built-in authentication
- ✅ Single deployment
- ✅ Free SSL certificates
- ✅ Global CDN
- ✅ CI/CD from GitHub

---

## Updating Frontend to Use API

### Create API Client:
```typescript
// src/api/backendClient.ts
const API_URL = import.meta.env.VITE_API_URL || '/api';

export async function getAllUsers() {
    const response = await fetch(`${API_URL}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
}

export async function saveUser(user: User) {
    const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
    if (!response.ok) throw new Error('Failed to save user');
    return response.json();
}

// ... more functions
```

### Update Storage Adapter:
```typescript
// src/utils/storage.ts
import * as backendClient from '@/api/backendClient';

export async function getAllUsers(): Promise<User[]> {
    if (import.meta.env.VITE_USE_API === 'true') {
        return await backendClient.getAllUsers();
    }
    // Fallback to localStorage
    return getFromLocalStorage<User>('pet_tracker_users');
}
```

---

## Cost Comparison

### Option 1: Azure Functions (Serverless)
- **Free tier**: 1M requests/month
- **After free tier**: $0.20 per million executions
- **Estimated**: $0-5/month for Pet Tracker

### Option 2: Azure App Service
- **Basic plan**: ~$13/month (B1)
- **Standard plan**: ~$75/month (S1)

### Option 3: Azure Static Web Apps
- **Free tier**: Perfect for Pet Tracker
- **Standard tier**: $9/month (if needed)

---

## Recommended Approach

For Pet Tracker, I recommend **Azure Static Web Apps**:
1. Deploy React app + Azure Functions together
2. Functions access Cosmos DB securely
3. Frontend calls Functions API
4. Everything in one deployment
5. Free tier covers your needs

Want me to implement this? Just ask! 🚀
