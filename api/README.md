# Pet Tracker API

Azure Functions backend for Pet Tracker application.

## Setup

### Prerequisites
- Node.js 18+
- Azure Functions Core Tools v4

### Install Dependencies
```bash
cd api
npm install
```

### Local Development
```bash
npm start
```

API will run on `http://localhost:7071`

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create/update user
- `DELETE /api/users/{nif}` - Delete user by NIF

### Walks
- `GET /api/walks` - Get all walks
- `GET /api/walks?userId={id}` - Get walks for specific user
- `POST /api/walks` - Create/update walk

### Challenges
- `GET /api/challenges` - Get all challenges
- `GET /api/challenges?userId={id}` - Get challenges for specific user  
- `POST /api/challenges` - Create/update challenge

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Save events (bulk)

## Environment Variables

Set in `local.settings.json` (local) or Azure App Settings (production):

- `COSMOS_ENDPOINT` - Cosmos DB endpoint URL
- `COSMOS_KEY` - Cosmos DB primary key

## Deployment

### Using Azure CLI
```bash
# Create Function App
az functionapp create --name pettracker-api \
  --resource-group rg-techradar-aut-001 \
  --consumption-plan-location westeurope \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --storage-account pettrackersto

# Deploy
cd api
func azure functionapp publish pettracker-api
```

### Using VS Code
1. Install Azure Functions extension
2. Right-click on `api` folder
3. Select "Deploy to Function App"
4. Follow prompts

## Testing

Test locally:
```bash
# Get users
curl http://localhost:7071/api/users

# Create user
curl -X POST http://localhost:7071/api/users \
  -H "Content-Type: application/json" \
  -d '{"nif":"123456789","email":"test@example.com","fullName":"Test User"}'
```
