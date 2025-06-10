import { WebSocketServer } from "ws";
import express from "express";
import wsConnections from "./wsConnections";

const app = express();
const PORT = process.env.PORT || 3000;

wsConnections();

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send(`Chess Platform Server`);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});