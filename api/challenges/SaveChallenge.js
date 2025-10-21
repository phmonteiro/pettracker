"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveChallenge = SaveChallenge;
const functions_1 = require("@azure/functions");
const cosmosService_1 = require("../cosmosService");
async function SaveChallenge(request, context) {
    try {
        await cosmosService_1.cosmosService.initializeDatabase();
        const container = cosmosService_1.cosmosService.getContainer('Challenges');
        const challenge = await request.json();
        // Validate required fields
        if (!challenge.id || !challenge.userId) {
            return {
                status: 400,
                jsonBody: { error: 'Challenge must have id and userId' }
            };
        }
        // Upsert the challenge (create or update)
        const { resource } = await container.items.upsert(challenge);
        return {
            status: 200,
            jsonBody: resource
        };
    }
    catch (error) {
        context.error('Error saving challenge:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to save challenge', details: error instanceof Error ? error.message : 'Unknown error' }
        };
    }
}
functions_1.app.http('SaveChallenge', {
    methods: ['POST', 'PUT'],
    authLevel: 'anonymous',
    route: 'challenges',
    handler: SaveChallenge
});
//# sourceMappingURL=SaveChallenge.js.map