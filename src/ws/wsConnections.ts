import { WebSocketServer, WebSocket } from "ws";
import { GameManager } from "../core/GameManager";
import http from "http";

export default function wsConnections(server: http.Server) {
  const wss = new WebSocketServer({ server }, () => {
    console.log("WebSocket server started");
  });
  const gameManager: GameManager = new GameManager();

  wss.on("connection", (ws) => {
    // console.log("player connected");
    gameManager.addPlayer(ws);

    ws.on("message", (message) => {});

    ws.on("close", () => {
      gameManager.removePlayer(ws);
      console.log("Client disconnected");
    });
  });
  console.log(
    "WebSocket server is running on port 3000 rather than ws://localhost:8080"
  );
}
