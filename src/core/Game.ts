import { WebSocket } from "ws";
import { Chess } from "chess.js";
import {MessageTypes as Messages} from "../ws/messages";

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

type move = { from: string; to: string };
export class Game {
  public whitePlayer: Player;
  public blackPlayer: Player;
  public board: Chess;
  public moves: move[];
  public startTime = Date.now();

  constructor(whitePlayer: Player, blackPlayer: Player) {
    this.whitePlayer = whitePlayer;
    this.blackPlayer = blackPlayer;
    this.board = new Chess();
    this.moves = [];
  }

  public makeMove(ws: WebSocket, move: { from: string; to: string }) {
    // Check if the move is valid

    //check if this is the player's turn
    if (this.board.moves.length * 2 === 0 && ws !== this.whitePlayer.ws) {
      // It's an even move, so it must be white's turn
      ws.send(
        JSON.stringify({ type: "error", message: "It's not your turn." })
      );
      return;
    } else if (this.board.moves.length * 2 > 0 && ws === this.whitePlayer.ws) {
      // It's an odd move, so it must be black's turn
      ws.send(
        JSON.stringify({ type: "error", message: "It's not your turn." })
      );
      return;
    }

    //move
    try {
      this.board.move(move);
    } catch (e) {
      ws.send(
        JSON.stringify({ type: "error", message: "Error in making move" })
      );
      return;
    }
    //update the board and push the move to the moves array
    this.moves.push(move);

    //check if game is over
    if (this.board.isGameOver()) {
      this.blackPlayer.ws.emit(
        JSON.stringify({
          type: Messages.Game_Over,
          payload: this.board.turn() === "w" ? "white" : "black",
        })
      );
    }

    //send the move and board to both players
    if (this.board.moves.length % 2 === 0) {
      this.whitePlayer.ws.emit(
        JSON.stringify({
          type: Messages.Move,
          payload: move,
        })
      );
    } else {
      this.blackPlayer.ws.emit(
        JSON.stringify({
          type: Messages.Move,
          payload: move,
        })
      );
    }
  }
}
