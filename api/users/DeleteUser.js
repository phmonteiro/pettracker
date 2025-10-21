"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteUser = DeleteUser;
const functions_1 = require("@azure/functions");
const cosmosService_1 = require("../cosmosService");
async function DeleteUser(request, context) {
    context.log('DeleteUser function triggered');
    try {
        const nif = request.params.nif;
        if (!nif) {
            return {
                status: 400,
                jsonBody: { error: 'NIF parameter is required' }
            };
        }
        const container = cosmosService_1.cosmosService.getContainer('Users');
        await container.item(nif, nif).delete();
        return {
            status: 200,
            jsonBody: { message: 'User deleted successfully', nif }
        };
    }
    catch (error) {
        if (error.code === 404) {
            return {
                status: 404,
                jsonBody: { error: 'User not found', nif: request.params.nif }
            };
        }
        context.error('Error deleting user:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to delete user', message: error.message }
        };
    }
}
functions_1.app.http('DeleteUser', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    route: 'users/{nif}',
    handler: DeleteUser
});
//# sourceMappingURL=DeleteUser.js.map