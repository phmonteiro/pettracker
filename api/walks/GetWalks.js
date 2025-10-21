"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetWalks = GetWalks;
const functions_1 = require("@azure/functions");
const cosmosService_1 = require("../cosmosService");
async function GetWalks(request, context) {
    context.log('GetWalks function triggered');
    try {
        const userId = request.query.get('userId');
        const container = cosmosService_1.cosmosService.getContainer('Walks');
        if (userId) {
            // Filter by userId
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.startTime DESC',
                parameters: [{ name: '@userId', value: userId }]
            };
            const { resources: walks } = await container.items.query(querySpec).fetchAll();
            return {
                status: 200,
                jsonBody: walks
            };
        }
        else {
            // Get all walks
            const { resources: walks } = await container.items.readAll().fetchAll();
            return {
                status: 200,
                jsonBody: walks
            };
        }
    }
    catch (error) {
        context.error('Error fetching walks:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to fetch walks', message: error.message }
        };
    }
}
functions_1.app.http('GetWalks', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'walks',
    handler: GetWalks
});
//# sourceMappingURL=GetWalks.js.map