import { WebSocketServer } from "ws";
import { GameManager } from "./GameManager";

const wss = new WebSocketServer({ port: 8080 });
const gameManager: GameManager = new GameManager();

wss.on("connection", (ws) => {
    console.log("player connected");
    gameManager.addPlayer(ws);
    
    ws.on("message", (message) => {
        
    });
        
    ws.on("close", () => {
        console.log("Client disconnected");
    });


});
console.log("WebSocket server is running on ws://localhost:8080");