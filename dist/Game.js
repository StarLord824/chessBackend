"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = exports.Player = void 0;
const chess_js_1 = require("chess.js");
const messages_1 = require("./messages");
class Player {
    ws;
    name;
    game;
    constructor(ws, name, game) {
        this.ws = ws;
        this.name = name;
        this.game = game;
    }
}
exports.Player = Player;
class Game {
    whitePlayer;
    blackPlayer;
    board;
    moves;
    startTime = Date.now();
    constructor(whitePlayer, blackPlayer) {
        this.whitePlayer = whitePlayer;
        this.blackPlayer = blackPlayer;
        this.board = new chess_js_1.Chess();
        this.moves = [];
    }
    makeMove(ws, move) {
        // Check if the move is valid
        //check if this is the player's turn
        if (this.board.moves.length * 2 === 0 && ws !== this.whitePlayer.ws) {
            // It's an even move, so it must be white's turn
            ws.send(JSON.stringify({ type: "error", message: "It's not your turn." }));
            return;
        }
        else if (this.board.moves.length * 2 > 0 && ws === this.whitePlayer.ws) {
            // It's an odd move, so it must be black's turn
            ws.send(JSON.stringify({ type: "error", message: "It's not your turn." }));
            return;
        }
        //move
        try {
            this.board.move(move);
        }
        catch (e) {
            ws.send(JSON.stringify({ type: "error", message: "Error in making move" }));
            return;
        }
        //update the board and push the move to the moves array
        this.moves.push(move);
        //check if game is over
        if (this.board.isGameOver()) {
            this.blackPlayer.ws.emit(JSON.stringify({
                type: messages_1.Game_Over,
                payload: this.board.turn() === "w" ? "white" : "black"
            }));
        }
        //send the move and board to both players
        if (this.board.moves.length % 2 === 0) {
            this.whitePlayer.ws.emit(JSON.stringify({
                type: messages_1.Move,
                payload: move
            }));
        }
        else {
            this.blackPlayer.ws.emit(JSON.stringify({
                type: messages_1.Move,
                payload: move
            }));
        }
    }
}
exports.Game = Game;
