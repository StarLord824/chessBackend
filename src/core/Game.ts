import { WebSocket } from "ws";
import { Chess, Move } from "chess.js";
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

export type MovePayload = { from: string; to: string };
export class Game {
  public whitePlayer: Player;
  public blackPlayer: Player;
  public board: Chess;
  public moves: MovePayload[];
  public startTime : number;

  constructor(whitePlayer: Player, blackPlayer: Player) {
    this.whitePlayer = whitePlayer;
    this.blackPlayer = blackPlayer;
    this.board = new Chess();
    this.moves = [];
    this.startTime = Date.now();
  }

  public makeMove(playerWs: WebSocket, move: MovePayload) {
    const playerColor = playerWs === this.whitePlayer.ws ? "w" : "b";

    //check if this is the player's turn, and if the move is valid
    if (this.board.turn() !== playerColor) {
      playerWs.send(JSON.stringify({
        type: "error",
        message: "It's not your turn."
      }));
      return;
    }
    const result = this.board.move(move as Move);
    if (!result) {
      playerWs.send(JSON.stringify({
        type: "error",
        message: "Invalid move."
      }));
      return;
    }

    // Save move
    this.moves.push(move);

    // Broadcast move to both players
    [this.whitePlayer, this.blackPlayer].forEach(p => {
      p.ws.send(JSON.stringify({
        type: Messages.Move,
        payload: {
          moves: this.moves, //includes full move history
          board: this.board.fen(),
          turn: this.board.turn()
        }
      }));
    });

    // Check for game over
    if (this.board.isGameOver()) {
      let winner: string;
      if (this.board.isCheckmate()) {
        winner = this.board.turn() === "w" ? "black" : "white"; // opposite of current turn
      } else {
        winner = "draw";
      }

      [this.whitePlayer, this.blackPlayer].forEach(p => {
        p.ws.send(JSON.stringify({
          type: Messages.Game_Over,
          payload: winner
        }));
      });
    }
  }
}
