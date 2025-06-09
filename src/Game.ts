import {WebSocket} from "ws";
import { Chess } from "chess.js";

export class Player {
    public ws: WebSocket;

    constructor(ws: WebSocket, name?: string) {
        this.ws = ws;
    }
}

export class Game {
    public whitePlayer: Player;
    public blackPlayer: Player;
    public board: Chess;
    public moves: string[];

    constructor(whitePlayer: Player, blackPlayer: Player) {
        this.whitePlayer = whitePlayer;
        this.blackPlayer = blackPlayer;
        this.board = new Chess();
        this.moves = [];
    }

    public makeMove(ws: WebSocket, move: {from: string, to: string}) {

    }
}