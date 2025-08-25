import { WebSocket } from "ws";
import { Game, Player } from "./Game";
import {MessageTypes as Messages} from "../ws/messages";

export class GameManager {
  private static playersCount = 0;
  private static players: Player[];
  private static games: Game[];
  private static pendingUser: Player | undefined;

  constructor() {
    GameManager.players = [];
    GameManager.games = [];
    GameManager.pendingUser = undefined;
  }

  public handleMessage(ws: WebSocket, type: string, payload: any) {
    const player = GameManager.players.find((p) => p.ws === ws);
    if (!player) {
      ws.send(
        JSON.stringify({ type: "error", message: "Player not found." }) 
      );
      return;
    }

    switch (type) {
      // case Messages.Player_Joined:
        //ops
        // this.addPlayer(ws, payload);
        // break;
      case Messages.Set_Name:
        player.name = payload;
        ws.send(JSON.stringify({ message: `Hello ${player.name}` }));
        this.broadcast(Messages.Player_Joined, player.name, ws);
        break;
      case Messages.Player_Left:
        this.removePlayer(ws);
        break;
      case Messages.Init_Game:
        this.startGame(player);
        break;
      // case Messages.Game_Started:
      //   //ops
      //   break;
      case Messages.Player_Moved:
        //ops
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

  public addPlayer(ws: WebSocket) {
    const player = new Player(ws);
    GameManager.players.push(player);
    ws.send(
      JSON.stringify({
        message: `Player ${++GameManager.playersCount} connection approved, give your name : `,
      })
    );
    // this.addHandler(player);
  }

  public removePlayer(ws: WebSocket) {
    const playerIndex = GameManager.players.findIndex(
      (player) => player.ws === ws
    )
    if (playerIndex !== -1) {
      GameManager.players.splice(playerIndex, 1);
      ws.send(
        JSON.stringify({ message: "Player disconnected." })
      );
    }
    //remove from queue
    if(GameManager.pendingUser?.ws === ws) {
      GameManager.pendingUser = undefined;
    }
    //stop his game
    const gameIndex = GameManager.games.findIndex(
      (game) => game.whitePlayer.ws === ws || game.blackPlayer.ws === ws
    );
    if (gameIndex !== -1) {
      const game = GameManager.games[gameIndex];
      const opponent = game.whitePlayer.ws === ws ? game.blackPlayer : game.whitePlayer;
      opponent.ws.send(
        JSON.stringify({ type: Messages.Player_Left, payload: opponent.name })
      );
      GameManager.games.splice(gameIndex, 1);
    }
  }

  public addHandler(player: Player) {
    // player.ws.on("open", () => {
    //     console.log(`Player ${player.name} connected, ab kuch message to bhejo`);
    //     // player.ws.send(JSON.stringify({ type: "init" }));
    // });
    player.ws.on("message", (message) => {
      const messageData = JSON.parse(message.toString());

      //setting player name
      if (messageData.type === Messages.Set_Name) {
        player.name = messageData.data;
        player.ws.send(JSON.stringify({ message: `Hello ${player.name}` }));
        GameManager.players.forEach((p) => {
          if (p.ws !== player.ws) {
            p.ws.send(
              JSON.stringify({ type: Messages.Player_Joined, payload: player.name })
            );
          }
        });
      }

      //enter a game
      if (messageData.type === Messages.Init_Game) {
        //a user is in the queue
        //start the game
        if (GameManager.pendingUser) {
          const game = new Game(GameManager.pendingUser, player);
          GameManager.games.push(game);

          //add game object to both players
          GameManager.pendingUser.game = game;
          player.game = game;

          // player.ws.send(JSON.stringify({ type: Game_Started, payload: game.board.fen() }));
          player.ws.send(
            JSON.stringify({
              type: Messages.Game_Started,
              payload: game.board.fen(),
              message: `The Culling Games are starting and you are assigned Black. Good luck ${player.name}!`,
            })
          );
          GameManager.pendingUser.ws.send(
            JSON.stringify({
              type: Messages.Game_Started,
              payload: game.board.fen(),
              message: `The Culling Games are starting and you are assigned White. Best of Luck ${GameManager.pendingUser.name}!`,
            })
          );
          GameManager.pendingUser = undefined;
        }
        //join the queue for matching
        else {
          GameManager.pendingUser = player;
          player.ws.send(
            JSON.stringify({
              message: "Waiting for your opponent to join the Culling games...",
            })
          );
        }
      }

      //making moves
      if (messageData.type === Messages.Move) {
        const move = messageData.data;
        const game = GameManager.games.find(
          (g) =>
            g.whitePlayer.ws === player.ws || g.blackPlayer.ws === player.ws
        );
        if (game) {
          game.makeMove(player.ws, move);
        } else {
          player.ws.send(
            JSON.stringify({ type: "error", message: "You are not in a game." })
          );
        }
      }
    });
  }

  public broadcast(type: string, payload: any, excludeWs?: WebSocket) {
    const ws = excludeWs ?? null;
    GameManager.players.forEach((p) => {
      if (p.ws !== ws) {
        p.ws.send(
          JSON.stringify({ type, payload })
        );
      }
    });
  }

  public startGame(player: Player) {
    //a user is in the queue
    //start the game
    if (GameManager.pendingUser) {
      const game = new Game(GameManager.pendingUser, player);
      GameManager.games.push(game);

      //add game object to both players
      GameManager.pendingUser.game = game;
      player.game = game;

      // player.ws.send(JSON.stringify({ type: Game_Started, payload: game.board.fen() }));
      player.ws.send(
        JSON.stringify({
          type: Messages.Game_Started,
          payload: game.board.fen(),
          message: `The Culling Games are starting and you are assigned Black. Good luck ${player.name}!`,
        })
      );
      GameManager.pendingUser.ws.send(
        JSON.stringify({
          type: Messages.Game_Started,
          payload: game.board.fen(),
          message: `The Culling Games are starting and you are assigned White. Best of Luck ${GameManager.pendingUser.name}!`,
        })
        );
      GameManager.pendingUser = undefined;
    }
    //join the queue for matching
    else {
      GameManager.pendingUser = player;
      player.ws.send(
        JSON.stringify({
          message: "Waiting for your opponent to join the Culling games...",
        })
      );
    }
  }

  public makeMove(player : Player, move: { from: string; to: string }) {
    const game = GameManager.games.find(
      (g) =>
        g.whitePlayer === player || g.blackPlayer === player
    );
    if (game) {
      game.makeMove(player.ws, move);
    } else {
      player.ws.send(
        JSON.stringify({ type: "error", message: "You are not in a game." })
      );
    }
  }

}


