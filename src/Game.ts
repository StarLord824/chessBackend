import {WebSocket} from "ws";
import { Chess } from "chess.js";

export class Player {
    public ws: WebSocket;
    public name?: string;
    public game?: Game;
    constructor(ws: WebSocket, name?: string, game?: Game) {
        this.ws = ws;
        this.name = name;
        this.game = game;
    }
}

export class Game {
    public whitePlayer: Player;
    public blackPlayer: Player;
    public board: Chess;
    public moves: string[];
    public startTime= Date.now();
    constructor(whitePlayer: Player, blackPlayer: Player) {
        this.whitePlayer = whitePlayer;
        this.blackPlayer = blackPlayer;
        this.board = new Chess();
        this.moves = [];
    }

    public makeMove(ws: WebSocket, move: {from: string, to: string}) {
        // Check if the move is valid
        //check if this is the player's turn
        //update the board and push the move to the moves array


        //check if game is over

        //send the move and board to both players
    }
}