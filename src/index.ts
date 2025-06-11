import { WebSocketServer } from "ws";
import express from "express";
import wsConnections from "./wsConnections";
import { createServer } from "http";

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

wsConnections(server);

app.use(express.static("public"));

app.get("/", (req, res) => {
    console.log("Received request for root path");
    res.send(`Chess Platform Server`);
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});