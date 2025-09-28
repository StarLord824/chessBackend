import { WebSocket } from "ws";
import { Game, Player } from "./Game";
import { MessageTypes as Messages } from "../ws/messages";
import { prisma } from "../Singleton";
import { auth } from "../auth";
import { MatchStatus } from "@prisma/client";
import { set } from "zod";
import { Chess } from "chess.js";

export class GameManager {
  // private playersCount = 0;
  private players: Player[];
  private games: Game[];
  private pendingUser: Player | undefined;
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map(); 
  
  constructor() {
    this.players = [];
    this.games = [];
    this.pendingUser = undefined;
  }

  public async restoreFromDb() {
      const inProgress = await prisma.match.findMany({
      where: { status: MatchStatus.IN_PROGRESS },
    });

    for (const m of inProgress) {
      // try to locate players in current memory; they may connect later
      const white = this.players.find((p) => p.id === m.whitePlayerId);
      const black = this.players.find((p) => p.id === m.blackPlayerId);

      // create placeholder players if socket missing (ws undefined for now)
      const whitePlayer = white ?? new Player(m.whitePlayerId, (null as any), undefined);
      const blackPlayer = black ?? new Player(m.blackPlayerId, (null as any), undefined);

      const game = new Game(whitePlayer, blackPlayer, m.id, m.fen ?? new Chess().fen(), (m.moves as any) ?? []);
      this.games.push(game);

      // if players were present in memory, attach game ref
      if (white) white.game = game;
      if (black) black.game = game;
    }
  }

  public handleMessage(ws: WebSocket, type: string, payload: any) {
    const player = this.players.find((p) => p.ws === ws);
    if (!player) {
      ws.send(JSON.stringify({ type: "error", message: "Player not found." }));
      return;
    }

    switch (type) {
      // case Messages.Player_Joined:
      //ops
      // this.addPlayer(ws, payload);
      // break;
      case Messages.Set_Name:
        this.setName(player, payload.username);
        break;
      case Messages.Player_Left:
        this.removePlayer(player);
        break;
      case Messages.Init_Game:
        this.startGame(player);
        break;
      case Messages.Move:
        this.makeMove(player, payload);
        break;
      case Messages.Game_Over:
        //ops
        break;
      default:
        ws.send(
          JSON.stringify({ type: "error", message: "Invalid message type." })
        );
    }
  }

  public async setName(player: Player, username: string) {
    if(player.username) {
      player.ws.send(JSON.stringify({ "type": "error", message: "Username already set" }));
      return;
    }
    try {
      await prisma.user.update({ where: { id: player.id }, data: { username } });
      player.username = username;
      player.ws.send(JSON.stringify({ message: `Hello ${username}` }));
      this.broadcast(Messages.Player_Joined, username, player.ws);
    } catch (err: any) {
      if (err?.code === "P2002") { // uniqueness violation
        player.ws.send(JSON.stringify({ type: "error", message: "Username taken." }));
      } else {
        console.error(err);
        player.ws.send(JSON.stringify({ type: "error", message: "Could not set username." }));
      }
    }
  }

  public async addPlayer(ws: WebSocket, req: any) {
    try {
      // 1. Extract session token from cookie or headers
      const token = req.headers.cookie?.match(/session=([^;]+)/)?.[1];
      if (!token) {
        ws.close(4001, "Unauthorized: no token");
        return;
      }

      // 2. Validate session using better-auth
      const session = await auth.api.getSession(token);
      if (!session) {
        ws.close(4001, "Unauthorized: invalid session");
        return;
      }

      // 3. Lookup user in DB
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      });
      if (!user) {
        ws.close(4001, "User not found");
        return;
      }

      // 4. Create Player object
      let player = this.players.find((p) => p.id === user.id);
      if (!player) {
        player = new Player(user.id, ws, user.username ?? undefined);
        this.players.push(player);
      }else{
        player.ws = ws;
      }

      // cancel any disconnect timer
      if (this.disconnectTimers.has(player.id)) {
        clearTimeout(this.disconnectTimers.get(player.id)!);
        this.disconnectTimers.delete(player.id);
      }

      // find an active match in DB for this user and restore/reference the Game in memory
      const activeMatch = await prisma.match.findFirst({
        where: {
          OR: [{ whitePlayerId: user.id }, { blackPlayerId: user.id }],
          status: MatchStatus.IN_PROGRESS,
        },
      });

      if (activeMatch) {
        let game = this.games.find((g) => g.id === activeMatch.id);
        if (!game) {
          // if the other player is in memory, link them; otherwise create placeholder
          const opponentId = activeMatch.whitePlayerId === user.id ? activeMatch.blackPlayerId : activeMatch.whitePlayerId;
          const opponent = this.players.find((p) => p.id === opponentId) ?? new Player(opponentId, (null as any), undefined);
          const white = activeMatch.whitePlayerId === user.id ? player : opponent;
          const black = activeMatch.whitePlayerId === user.id ? opponent : player;

          game = new Game(white, black, activeMatch.id, activeMatch.fen ?? new Chess().fen(), (activeMatch.moves as any) ?? []);
          this.games.push(game);
        } else {
          // restore websocket on the player inside the game object
          if (game.whitePlayer.id === player.id) game.whitePlayer.ws = ws;
          if (game.blackPlayer.id === player.id) game.blackPlayer.ws = ws;
          player.game = game;
        }
        
        // send resume payload
        ws.send(
          JSON.stringify({
            type: Messages.Game_Resumed,
            payload: {
              fen: game.board.fen(),
              moves: game.moves,
              turn: game.board.turn()
            },
            message: "Game restored!"
          })
        );
      } else {
        // no active match — normal onboarding welcome
        ws.send(
          JSON.stringify({
            type: Messages.Player_Joined,
            message: user.username ? `Welcome back, ${user.username}!` : `Welcome! Please set your username.`,
            payload: { id: user.id, username: user.username }
          })
        );
      }
      return player;
      
    } catch (err) {
      console.error("Error adding player:", err);
      ws.close(4001, "Auth error");
    }
  }

  public handleConnectionClose(ws: WebSocket) {
    
    const player = this.players.find((p) => p.ws === ws);
    if (!player) return;

    // remove socket ref but keep player in memory to allow reconnect
    player.ws = (null as any);

    // If player in a game, start a disconnect timer (60s)
    if (player.game) {
      const game = player.game;
      const opponent = game.whitePlayer.id === player.id ? game.blackPlayer : game.whitePlayer;

      // notify opponent (if they have socket)
      if (opponent.ws) {
        try {
          opponent.ws.send(JSON.stringify({
            type: Messages.Player_Left,
            message: "Opponent disconnected. Waiting 60s for reconnection...",
          }));
        } catch (e) {}
      }

      // start timer
      const t = setTimeout(async () => {
        // check if player reconnected
        const rePlayer = this.players.find((p) => p.id === player.id && p.ws);
        if (rePlayer) return; // reconnected

        // abort match
        await prisma.match.update({
          where: { id: game.id },
          data: {
            status: MatchStatus.ABORTED,
            endReason: "ABORTED",
            updatedAt: new Date(),
          },
        });

        // notify opponent if present
        if (opponent.ws) {
          try {
            opponent.ws.send(JSON.stringify({
              type: Messages.Game_Aborted,
              message: "Opponent did not return. Game aborted.",
            }));
          } catch (e) {}
        }

        // remove game from memory
        this.games = this.games.filter((g) => g.id !== game.id);
      }, 60 * 1000);

      this.disconnectTimers.set(player.id, t);
    } else {
      // No game — remove player from player list immediately
      this.players = this.players.filter((p) => p.id !== player.id);
    }
  }

  public async removePlayer(player: Player) {
    const playerIndex = this.players.findIndex((p) => p === player);
    if (playerIndex !== -1) {
      this.players.splice(playerIndex, 1);
      player.ws.send(JSON.stringify({ message: "You left the game." }));
    }
    //remove from queue
    if (this.pendingUser?.ws === player.ws) {
      this.pendingUser = undefined;
    } else {
      //stop his game
      const gameIndex = this.games.findIndex(
        (game) => game.whitePlayer === player || game.blackPlayer === player
      );
      if (gameIndex !== -1) {
        const game = this.games[gameIndex];
        await prisma.match.update({
          where: { id: game.id },
          data: {
            status: MatchStatus.ABORTED,
            updatedAt: new Date()
          }
        });

        const opponent = game.whitePlayer === player ? game.blackPlayer : game.whitePlayer;
        opponent.ws.send(
          JSON.stringify({
            type: Messages.Player_Left,
            payload: opponent.username,
            message: `Opponent has left the game.`,
          })
        );
        this.games.splice(gameIndex, 1);
      }
    }
  }

  public broadcast(type: string, payload: any, excludeWs?: WebSocket) {
    this.players.forEach((p) => {
      if (p.ws && p.ws !== excludeWs) {
        try {
          p.ws.send(JSON.stringify({ type, payload }));
        } catch (e) {
          console.log("Error broadcasting message to player", e);
        }
      }
    });
  }

  public async startGame(player: Player) {
    //a user is in the queue
    //start the game
    if (this.pendingUser && this.pendingUser.id !== player.id) {

      const initialFen = new Chess().fen();
      
      const dbMatch = await prisma.match.create({
        data: {
          whitePlayerId: this.pendingUser.id,
          blackPlayerId: player.id,
          status: MatchStatus.IN_PROGRESS,
          moves: [],
          fen: initialFen,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      const game = new Game(this.pendingUser, player, dbMatch.id, initialFen, []);

      //add game object to both players
      this.pendingUser.game = game;
      player.game = game;

      this.games.push(game);
      // player.ws.send(JSON.stringify({ type: Game_Started, payload: game.board.fen() }));
      player.ws.send(
        JSON.stringify({
          type: Messages.Game_Started,
          payload: game.board.fen(),
          message: `The Culling Games are starting and you are assigned Black. Good luck ${player.username}!`,
        })
      );
      this.pendingUser.ws.send(
        JSON.stringify({
          type: Messages.Game_Started,
          payload: game.board.fen(),
          message: `The Culling Games are starting and you are assigned White. Best of Luck ${this.pendingUser.username}!`,
        })
      );
      this.pendingUser = undefined;
    }
    //join the queue for matching
    else {
      this.pendingUser = player;
      player.ws?.send(
        JSON.stringify({
          message: "Waiting for opponent ...",
        })
      );
    }
  }

  public makeMove(player: Player, move: { from: string; to: string }) {
    const game = this.games.find(
      (g) => g.whitePlayer === player || g.blackPlayer === player
    );
    if (!game) {
      player.ws.send(
        JSON.stringify({ type: "error", message: "You are not in a game." })
      );
    }else {
      game.makeMove(player.ws, move);
    }
  }
}
