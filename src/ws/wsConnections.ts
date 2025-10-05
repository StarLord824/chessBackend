import { WebSocketServer, WebSocket } from "ws";
import { GameManager } from "../core/GameManager";
import http from "http";

export default function wsConnections(server: http.Server) {
  const wss = new WebSocketServer({ server }, () => {
    console.log("WebSocket server started");
  });

  const gameManager: GameManager = new GameManager();
  
  // restore in-progress matches from DB to memory
  gameManager.restoreFromDb().then(() => console.log("Restored games from DB"));
  
  // heartbeat
  const interval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping(() => {});
    });
  }, 30000);

  wss.on("connection", (ws: any, req) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    
    console.log("player connected");
    const email = new URLSearchParams(req.url?.split('?')[1]).get('email');
    if(!email){
      ws.close(4001, "Unauthorized: no email");
      return;
    }
    gameManager.addPlayer(ws, req, email);

    ws.on("message", (message : Buffer) => {
      try {
        const {type, payload} = JSON.parse(message.toString());
        gameManager.handleMessage(ws, type, payload);
      } catch (e) {
        console.log(`Invalid message from client:`, e);
        ws.send(JSON.stringify({ type: "error", message: "Invalid message." }));
      }
    });

    ws.on("close", () => {
      gameManager.handleConnectionClose(ws);
      // gameManager.handleMessage(ws, `PlayerLeft`, null);
      console.log("Client disconnected");
    });
  });
  console.log(
    "WebSocket server is bound to HTTP server"
  );
}
