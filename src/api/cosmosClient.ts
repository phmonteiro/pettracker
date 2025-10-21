import { CosmosClient, Database, Container } from '@azure/cosmos';
import type { User, Walk, Challenge, TrackimoEvent } from '@/types';

/**
 * Azure Cosmos DB Client
 * Manages connection and operations with Cosmos DB
 */

// Configuration from environment variables
const endpoint = import.meta.env.VITE_COSMOS_ENDPOINT;
const key = import.meta.env.VITE_COSMOS_KEY;
const databaseId = 'PetTrackerDB';

// Container (collection) names
const CONTAINERS = {
  USERS: 'Users',
  WALKS: 'Walks',
  CHALLENGES: 'Challenges',
  EVENTS: 'Events',
} as const;

class CosmosDBClient {
  private client: CosmosClient | null = null;
  private database: Database | null = null;
  private containers: Map<string, Container> = new Map();

  /**
   * Initialize Cosmos DB client and ensure database/containers exist
   */
  async initialize(): Promise<void> {
    if (!endpoint || !key) {
      throw new Error('Cosmos DB credentials not configured. Check .env file.');
    }

    try {
      // Create client
      this.client = new CosmosClient({ endpoint, key });

      // Create database if it doesn't exist
      const { database } = await this.client.databases.createIfNotExists({
        id: databaseId,
      });
      this.database = database;

      // Create containers if they don't exist
      await this.createContainer(CONTAINERS.USERS, '/nif');
      await this.createContainer(CONTAINERS.WALKS, '/userId');
      await this.createContainer(CONTAINERS.CHALLENGES, '/userId');
      await this.createContainer(CONTAINERS.EVENTS, '/deviceId');

      console.log('✅ Cosmos DB initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Cosmos DB:', error);
      throw error;
    }
  }

  /**
   * Create a container (collection) if it doesn't exist
   */
  private async createContainer(
    containerId: string,
    partitionKey: string
  ): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const { container } = await this.database.containers.createIfNotExists({
      id: containerId,
      partitionKey,
    });

    this.containers.set(containerId, container);
  }

  /**
   * Get a container instance
   */
  private getContainer(containerId: string): Container {
    const container = this.containers.get(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not initialized`);
    }
    return container;
  }

  // ===== USERS =====

  async getAllUsers(): Promise<User[]> {
    const container = this.getContainer(CONTAINERS.USERS);
    const { resources } = await container.items.readAll<User>().fetchAll();
    return resources;
  }

  async getUserByNif(nif: string): Promise<User | undefined> {
    const container = this.getContainer(CONTAINERS.USERS);
    try {
      const { resource } = await container.item(nif, nif).read<User>();
      return resource;
    } catch (error: any) {
      if (error.code === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | undefined> {
    const container = this.getContainer(CONTAINERS.USERS);
    const query = 'SELECT * FROM c WHERE c.id = @id';
    const { resources } = await container.items
      .query<User>({
        query,
        parameters: [{ name: '@id', value: id }],
      })
      .fetchAll();
    return resources[0];
  }

  async saveUser(user: User): Promise<void> {
    const container = this.getContainer(CONTAINERS.USERS);
    await container.items.upsert(user);
  }

  async deleteUser(nif: string): Promise<void> {
    const container = this.getContainer(CONTAINERS.USERS);
    await container.item(nif, nif).delete();
  }

  async deleteAllUsers(): Promise<void> {
    const users = await this.getAllUsers();
    const container = this.getContainer(CONTAINERS.USERS);
    await Promise.all(users.map((user) => container.item(user.nif, user.nif).delete()));
  }

  // ===== WALKS =====

  async getAllWalks(): Promise<Walk[]> {
    const container = this.getContainer(CONTAINERS.WALKS);
    const { resources } = await container.items.readAll<Walk>().fetchAll();
    return resources;
  }

  async getWalkById(id: string): Promise<Walk | undefined> {
    const container = this.getContainer(CONTAINERS.WALKS);
    const query = 'SELECT * FROM c WHERE c.id = @id';
    const { resources } = await container.items
      .query<Walk>({
        query,
        parameters: [{ name: '@id', value: id }],
      })
      .fetchAll();
    return resources[0];
  }

  async getWalksByUserId(userId: string): Promise<Walk[]> {
    const container = this.getContainer(CONTAINERS.WALKS);
    const query = 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.startTime DESC';
    const { resources } = await container.items
      .query<Walk>({
        query,
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();
    return resources;
  }

  async getWalksByDateRange(startDate: Date, endDate: Date): Promise<Walk[]> {
    const container = this.getContainer(CONTAINERS.WALKS);
    const query = `
      SELECT * FROM c 
      WHERE c.startTime >= @startDate AND c.startTime <= @endDate 
      ORDER BY c.startTime DESC
    `;
    const { resources } = await container.items
      .query<Walk>({
        query,
        parameters: [
          { name: '@startDate', value: startDate.toISOString() },
          { name: '@endDate', value: endDate.toISOString() },
        ],
      })
      .fetchAll();
    return resources;
  }

  async saveWalk(walk: Walk): Promise<void> {
    const container = this.getContainer(CONTAINERS.WALKS);
    await container.items.upsert(walk);
  }

  async deleteWalk(id: string, userId: string): Promise<void> {
    const container = this.getContainer(CONTAINERS.WALKS);
    await container.item(id, userId).delete();
  }

  async deleteAllWalks(): Promise<void> {
    const walks = await this.getAllWalks();
    const container = this.getContainer(CONTAINERS.WALKS);
    await Promise.all(walks.map((walk) => container.item(walk.id, walk.userId).delete()));
  }

  // ===== CHALLENGES =====

  async getAllChallenges(): Promise<Challenge[]> {
    const container = this.getContainer(CONTAINERS.CHALLENGES);
    const { resources } = await container.items.readAll<Challenge>().fetchAll();
    return resources;
  }

  async getChallengesByUserId(userId: string): Promise<Challenge[]> {
    const container = this.getContainer(CONTAINERS.CHALLENGES);
    const query = 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.period DESC';
    const { resources } = await container.items
      .query<Challenge>({
        query,
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();
    return resources;
  }

  async getChallengesByPeriod(startDate: Date, endDate: Date): Promise<Challenge[]> {
    const container = this.getContainer(CONTAINERS.CHALLENGES);
    const query = `
      SELECT * FROM c 
      WHERE c.period >= @startDate AND c.period <= @endDate 
      ORDER BY c.period DESC
    `;
    const { resources } = await container.items
      .query<Challenge>({
        query,
        parameters: [
          { name: '@startDate', value: startDate.toISOString().substring(0, 10) },
          { name: '@endDate', value: endDate.toISOString().substring(0, 10) },
        ],
      })
      .fetchAll();
    return resources;
  }

  async saveChallenge(challenge: Challenge): Promise<void> {
    const container = this.getContainer(CONTAINERS.CHALLENGES);
    await container.items.upsert(challenge);
  }

  async deleteChallenge(id: string, userId: string): Promise<void> {
    const container = this.getContainer(CONTAINERS.CHALLENGES);
    await container.item(id, userId).delete();
  }

  async deleteAllChallenges(): Promise<void> {
    const challenges = await this.getAllChallenges();
    const container = this.getContainer(CONTAINERS.CHALLENGES);
    await Promise.all(
      challenges.map((challenge) => container.item(challenge.id, challenge.userId).delete())
    );
  }

  // ===== EVENTS =====

  async getAllEvents(): Promise<TrackimoEvent[]> {
    const container = this.getContainer(CONTAINERS.EVENTS);
    const { resources } = await container.items.readAll<TrackimoEvent>().fetchAll();
    return resources;
  }

  async saveEvent(event: TrackimoEvent): Promise<void> {
    const container = this.getContainer(CONTAINERS.EVENTS);
    await container.items.upsert(event);
  }

  async saveEvents(events: TrackimoEvent[]): Promise<void> {
    const container = this.getContainer(CONTAINERS.EVENTS);
    await Promise.all(events.map((event) => container.items.upsert(event)));
  }

  async deleteAllEvents(): Promise<void> {
    const events = await this.getAllEvents();
    const container = this.getContainer(CONTAINERS.EVENTS);
    await Promise.all(
      events.map((event) => container.item(event.id.toString(), event.deviceId.toString()).delete())
    );
  }

  // ===== UTILITY =====

  /**
   * Check if Cosmos DB is configured and accessible
   */
  isConfigured(): boolean {
    return !!(endpoint && key);
  }

  /**
   * Test connection to Cosmos DB
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        await this.initialize();
      }
      return true;
    } catch (error) {
      console.error('Cosmos DB connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cosmosClient = new CosmosDBClient();

// Export initialization function
export async function initializeCosmosDB(): Promise<void> {
  await cosmosClient.initialize();
}
