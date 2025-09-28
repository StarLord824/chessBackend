import { WebSocket } from "ws";
import { Chess, Move } from "chess.js";
import {MessageTypes as Messages} from "../ws/messages";
import { prisma } from "../Singleton";
import { MatchStatus } from "@prisma/client";
import { en } from "zod/locales";

export class Player {
  public id: string;
  public ws: WebSocket;
  public username?: string;
  public game?: Game;
  public color? : "w" | "b";
  constructor(id: string, ws: WebSocket, username?: string, game?: Game) {
    this.id = id;
    this.ws = ws;
    this.username = username;
    this.game = game;
  }
}

export type MovePayload = { from: string; to: string, promotion?: "q" | "r" | "b" | "n" };

export class Game {
  public id: number;
  public whitePlayer: Player;
  public blackPlayer: Player;
  public board: Chess;
  // public moves: MovePayload[];
  public moves: Array< {from: string, to: string, san: string, ts: number } >;
  public startTime : number;

  constructor(whitePlayer: Player, blackPlayer: Player, id: number, fen?: string, moves?: Array< {from: string, to: string, san: string, ts: number } >) {
    this.id = id;
    this.whitePlayer = whitePlayer;
    this.blackPlayer = blackPlayer;
    this.board = new Chess();
    if(fen){
      this.board.load(fen);
    }
    this.moves = moves ?? [];
    this.startTime = Date.now();

    this.whitePlayer.color = "w";
    this.blackPlayer.color = "b";
    this.whitePlayer.game = this;
    this.blackPlayer.game = this;
  }

  public async makeMove(playerWs: WebSocket, move: MovePayload) {
    const playerColor = playerWs === this.whitePlayer.ws ? "w" : "b";

    //check if this is the player's turn, and if the move is valid
    if (this.board.turn() !== playerColor) {
      playerWs.send(JSON.stringify({
        type: "error",
        message: "It's not your turn."
      }));
      return;
    }
    //perform move using chess.js library
    const result = this.board.move({ from: move.from, to: move.to, promotion: move.promotion } as Move);
    if (!result) {
      playerWs.send(JSON.stringify({
        type: "error",
        message: "Invalid move."
      }));
      return;
    }
    const san = result.san ?? `${move.from}${move.to}`;
    const ts = Date.now();
    // Save move
    this.moves.push({ from: move.from, to: move.to, san, ts });

    //persist move + fen
    await prisma.match.update({
      where: { id: this.id },
      data: {
        moves: this.moves,
        fen: this.board.fen(),
        updatedAt: new Date()
      }
    });

    // Broadcast move to both players
    [this.whitePlayer, this.blackPlayer].forEach(p => {
      try {
        p.ws.send(JSON.stringify({
          type: Messages.Move,
          payload: {
            moves: this.moves, //includes full move history
            board: this.board.fen(),
            turn: this.board.turn(),
            move: { from: move.from, to: move.to, san, ts }
          }
        }));
      } catch (e) {
        console.log("Error sending move to player", e);
      }
    });

    // Check for game over
    if (this.board.isGameOver()) {
      let winner: string | null = null;
      let endReason = 'Unknown';

      if (this.board.isCheckmate()) {
        winner = this.board.turn() === "w" ? "black" : "white"; // opposite of current turn
        endReason = "Checkmate";
      } else if(this.board.isDraw()){
        winner = null;
        endReason = "Draw";
      } else if(this.board.isStalemate()){
        winner = null;
        endReason = "Stalemate";
      }

      await prisma.match.update({
        where: { id: this.id },
        data: {
          status: MatchStatus.FINISHED,
          // winnerId: winner === "draw" ? null : winner === "black" ? this.blackPlayer.id : this.whitePlayer.id,
          winnerId: winner === "black" ? this.blackPlayer.id : winner === "white" ? this.whitePlayer.id : null,
          result: winner === "black" ? "0-1" : winner === "white" ? "1-0" : "1/2-1/2",
          endReason,
          updatedAt: new Date(),
        }
      });
      
      [this.whitePlayer, this.blackPlayer].forEach(p => {
        p.ws.send(JSON.stringify({
          type: Messages.Game_Over,
          payload: {winner, endReason}
        }));
      });
    }
  }
}
