import { CosmosClient, Database, Container } from '@azure/cosmos';

const endpoint = process.env.COSMOS_ENDPOINT!;
const key = process.env.COSMOS_KEY!;
const databaseId = 'PetTrackerDB';

class CosmosService {
  private client: CosmosClient;
  private database: Database;
  
  constructor() {
    this.client = new CosmosClient({ endpoint, key });
    this.database = this.client.database(databaseId);
  }

  async initializeDatabase(): Promise<void> {
    // Create database if it doesn't exist
    await this.client.databases.createIfNotExists({ id: databaseId });
    
    // Create containers if they don't exist
    await this.database.containers.createIfNotExists({ id: 'Users', partitionKey: '/nif' });
    await this.database.containers.createIfNotExists({ id: 'Walks', partitionKey: '/userId' });
    await this.database.containers.createIfNotExists({ id: 'Challenges', partitionKey: '/userId' });
    await this.database.containers.createIfNotExists({ id: 'Events', partitionKey: '/deviceId' });
  }

  getContainer(containerId: string): Container {
    return this.database.container(containerId);
  }
}

// Export singleton instance
export const cosmosService = new CosmosService();

// Initialize on module load
cosmosService.initializeDatabase().catch(console.error);
