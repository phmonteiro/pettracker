"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveWalk = SaveWalk;
const functions_1 = require("@azure/functions");
const cosmosService_1 = require("../cosmosService");
async function SaveWalk(request, context) {
    context.log('SaveWalk function triggered');
    try {
        const walk = await request.json();
        if (!walk || !walk.id || !walk.userId) {
            return {
                status: 400,
                jsonBody: { error: 'Invalid walk data. id and userId are required.' }
            };
        }
        const container = cosmosService_1.cosmosService.getContainer('Walks');
        const { resource } = await container.items.upsert(walk);
        return {
            status: 200,
            jsonBody: resource
        };
    }
    catch (error) {
        context.error('Error saving walk:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to save walk', message: error.message }
        };
    }
}
functions_1.app.http('SaveWalk', {
    methods: ['POST', 'PUT'],
    authLevel: 'anonymous',
    route: 'walks',
    handler: SaveWalk
});
//# sourceMappingURL=SaveWalk.js.map