# Deployment Guide - Pet Tracker

This guide explains how to deploy the Pet Tracker application to Azure using Static Web Apps + Functions.

## Architecture

```
Frontend (React) → Azure Static Web Apps
                ↓
Backend (Functions) → Azure Cosmos DB
```

- **Frontend**: React app served from Azure Static Web Apps
- **Backend**: Azure Functions API for server-side operations
- **Database**: Azure Cosmos DB for persistent storage

## Prerequisites

- Azure subscription
- Azure CLI installed
- Node.js 18+
- Azure Functions Core Tools v4

## Part 1: Test Locally

### 1. Start Azure Functions API

```powershell
cd c:\repos\petTracker\PetTracker\api
npm start
```

API will run on `http://localhost:7071`

### 2. Start React Frontend

In a new terminal:

```powershell
cd c:\repos\petTracker\PetTracker
npm run dev
```

App will run on `http://localhost:3001`

### 3. Test the Integration

- Open browser to `http://localhost:3001`
- Open DevTools Console
- In Console, test the API:

```javascript
// Test getting users
const { backendAPI } = await import('./src/api/backendClient.ts');
const users = await backendAPI.getUsers();
console.log('Users:', users);
```

## Part 2: Deploy to Azure

### Option A: Deploy with Azure Static Web Apps (Recommended)

Azure Static Web Apps automatically deploys both frontend and API together.

#### 1. Create Static Web App

```powershell
# Login to Azure
az login

# Set your subscription
az account set --subscription "your-subscription-id"

# Create Static Web App (it will detect the Functions API automatically)
az staticwebapp create `
  --name pettracker-app `
  --resource-group rg-techradar-aut-001 `
  --location westeurope `
  --source https://github.com/your-username/pettracker `
  --branch main `
  --app-location "/" `
  --api-location "api" `
  --output-location "dist"
```

#### 2. Configure Environment Variables in Azure Portal

1. Go to Azure Portal → Your Static Web App → Configuration
2. Add Application settings:
   - `COSMOS_ENDPOINT`: Your Cosmos DB endpoint
   - `COSMOS_KEY`: Your Cosmos DB primary key

#### 3. Set Frontend Environment Variable

Create `.env.production`:

```
VITE_API_URL=/api
```

Static Web Apps automatically proxies `/api` to the Functions backend.

#### 4. Deploy via GitHub Actions

The static web app will set up GitHub Actions automatically. Just push to your repo:

```powershell
git add .
git commit -m "Deploy Pet Tracker"
git push origin main
```

### Option B: Deploy Separately

#### 1. Deploy Azure Functions

```powershell
cd c:\repos\petTracker\PetTracker\api

# Create Function App
az functionapp create `
  --name pettracker-api `
  --resource-group rg-techradar-aut-001 `
  --consumption-plan-location westeurope `
  --runtime node `
  --runtime-version 18 `
  --functions-version 4 `
  --storage-account pettrackersto

# Set environment variables
az functionapp config appsettings set `
  --name pettracker-api `
  --resource-group rg-techradar-aut-001 `
  --settings COSMOS_ENDPOINT="your-endpoint" COSMOS_KEY="your-key"

# Deploy
func azure functionapp publish pettracker-api
```

#### 2. Enable CORS

```powershell
az functionapp cors add `
  --name pettracker-api `
  --resource-group rg-techradar-aut-001 `
  --allowed-origins "https://pettracker-app.azurestaticapps.net"
```

#### 3. Deploy Frontend to Static Web Apps

```powershell
cd c:\repos\petTracker\PetTracker

# Build
npm run build

# Create Static Web App
az staticwebapp create `
  --name pettracker-app `
  --resource-group rg-techradar-aut-001 `
  --location westeurope

# Deploy (using SWA CLI)
npx @azure/static-web-apps-cli deploy `
  --app-location . `
  --output-location dist `
  --deployment-token "your-deployment-token"
```

## Part 3: Verify Deployment

### 1. Check Function App

Visit: `https://pettracker-api.azurewebsites.net/api/users`

Should return JSON array of users.

### 2. Check Static Web App

Visit: `https://pettracker-app.azurestaticapps.net`

App should load and function properly.

### 3. Monitor Logs

```powershell
# Stream Function logs
az functionapp log tail `
  --name pettracker-api `
  --resource-group rg-techradar-aut-001

# View Static Web App logs
az staticwebapp show `
  --name pettracker-app `
  --resource-group rg-techradar-aut-001
```

## Costs Estimation

- **Azure Cosmos DB**: ~$24-30/month (Standard tier, West Europe)
- **Azure Functions**: ~$0/month on Consumption plan (1M executions free)
- **Azure Static Web Apps**: ~$0/month (Free tier) or $9/month (Standard)
- **Storage Account**: ~$1-2/month

**Total**: ~$25-40/month

## Troubleshooting

### Functions Not Connecting to Cosmos DB

Check environment variables:

```powershell
az functionapp config appsettings list `
  --name pettracker-api `
  --resource-group rg-techradar-aut-001
```

### CORS Errors

Add your domain to allowed origins:

```powershell
az functionapp cors add `
  --name pettracker-api `
  --resource-group rg-techradar-aut-001 `
  --allowed-origins "https://your-domain.com"
```

### Frontend Can't Reach API

Check `VITE_API_URL` in production environment:

- For Static Web Apps: Use `/api` (auto-proxied)
- For separate deployment: Use full Function App URL

### Database Errors

Check Cosmos DB connection in Azure Portal:
1. Go to Cosmos DB → Data Explorer
2. Verify database `PetTrackerDB` exists
3. Verify containers exist: Users, Walks, Challenges, Events

## Rolling Back

### Rollback Functions

```powershell
# List deployments
az functionapp deployment list `
  --name pettracker-api `
  --resource-group rg-techradar-aut-001

# Rollback to previous
az functionapp deployment source sync `
  --name pettracker-api `
  --resource-group rg-techradar-aut-001
```

### Rollback Static Web App

Use Azure Portal → Static Web App → Environments → Select previous deployment

## Next Steps

After deployment:

1. ✅ Set up custom domain
2. ✅ Configure SSL certificate (auto with Static Web Apps)
3. ✅ Set up monitoring and alerts
4. ✅ Configure backup strategy for Cosmos DB
5. ✅ Set up CI/CD pipeline (GitHub Actions)
6. ✅ Add authentication (Azure AD B2C)

## Support

- Azure Functions: https://docs.microsoft.com/azure/azure-functions/
- Static Web Apps: https://docs.microsoft.com/azure/static-web-apps/
- Cosmos DB: https://docs.microsoft.com/azure/cosmos-db/
