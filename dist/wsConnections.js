"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = wsConnections;
const ws_1 = require("ws");
const GameManager_1 = require("./GameManager");
function wsConnections() {
    const wss = new ws_1.WebSocketServer({ port: 8080 }, () => {
        console.log("WebSocket server started");
    });
    const gameManager = new GameManager_1.GameManager();
    wss.on("connection", (ws) => {
        // console.log("player connected");
        gameManager.addPlayer(ws);
        ws.on("message", (message) => {
        });
        ws.on("close", () => {
            gameManager.removePlayer(ws);
            console.log("Client disconnected");
        });
    });
    console.log("WebSocket server is running on ws://localhost:8080");
}
