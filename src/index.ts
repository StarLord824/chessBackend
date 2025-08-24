import express from "express";
import { createServer } from "http";
import wsConnections from "./ws/wsConnections";
import matchRouter from "./routes/matches";
import userRouter from "./routes/users";
import authRouter from "./routes/auth";


const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

wsConnections(server);

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded());

app.use("/api/matches", matchRouter);
app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);


app.get("/", (req, res) => {
  res.send(`Chess Platform Server`);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
