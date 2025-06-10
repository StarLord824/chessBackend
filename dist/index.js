"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const wsConnections_1 = __importDefault(require("./wsConnections"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
(0, wsConnections_1.default)();
app.use(express_1.default.static("public"));
app.get("/", (req, res) => {
    res.send(`Chess Platform Server`);
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
