"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetChallenges = GetChallenges;
const functions_1 = require("@azure/functions");
const cosmosService_1 = require("../cosmosService");
async function GetChallenges(request, context) {
    try {
        await cosmosService_1.cosmosService.initializeDatabase();
        const container = cosmosService_1.cosmosService.getContainer('Challenges');
        const userId = request.query.get('userId');
        let challenges;
        if (userId) {
            // Get challenges for specific user
            const query = {
                query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.startDate DESC',
                parameters: [{ name: '@userId', value: userId }]
            };
            const { resources } = await container.items.query(query).fetchAll();
            challenges = resources;
        }
        else {
            // Get all challenges
            const { resources } = await container.items.readAll().fetchAll();
            challenges = resources;
        }
        return {
            status: 200,
            jsonBody: challenges
        };
    }
    catch (error) {
        context.error('Error fetching challenges:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to fetch challenges', details: error instanceof Error ? error.message : 'Unknown error' }
        };
    }
}
functions_1.app.http('GetChallenges', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'challenges',
    handler: GetChallenges
});
//# sourceMappingURL=GetChallenges.js.map