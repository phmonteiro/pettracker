"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cosmosService = void 0;
const cosmos_1 = require("@azure/cosmos");
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = 'PetTrackerDB';
class CosmosService {
    constructor() {
        this.client = new cosmos_1.CosmosClient({ endpoint, key });
        this.database = this.client.database(databaseId);
    }
    async initializeDatabase() {
        // Create database if it doesn't exist
        await this.client.databases.createIfNotExists({ id: databaseId });
        // Create containers if they don't exist
        await this.database.containers.createIfNotExists({ id: 'Users', partitionKey: '/nif' });
        await this.database.containers.createIfNotExists({ id: 'Walks', partitionKey: '/userId' });
        await this.database.containers.createIfNotExists({ id: 'Challenges', partitionKey: '/userId' });
        await this.database.containers.createIfNotExists({ id: 'Events', partitionKey: '/deviceId' });
    }
    getContainer(containerId) {
        return this.database.container(containerId);
    }
}
// Export singleton instance
exports.cosmosService = new CosmosService();
// Initialize on module load
exports.cosmosService.initializeDatabase().catch(console.error);
//# sourceMappingURL=cosmosService.js.map