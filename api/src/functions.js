"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Export all functions for Azure Functions v4
__exportStar(require("../users/GetUsers"), exports);
__exportStar(require("../users/SaveUser"), exports);
__exportStar(require("../users/DeleteUser"), exports);
__exportStar(require("../walks/GetWalks"), exports);
__exportStar(require("../walks/SaveWalk"), exports);
__exportStar(require("../challenges/GetChallenges"), exports);
__exportStar(require("../challenges/SaveChallenge"), exports);
__exportStar(require("../events/GetEvents"), exports);
__exportStar(require("../events/SaveEvents"), exports);
//# sourceMappingURL=functions.js.map