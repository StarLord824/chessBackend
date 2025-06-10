import { WebSocket } from "ws";
import { Game, Player } from "./Game";
import { Init_Game, Move } from "./messages";

export class GameManager {
    private static players: Player[];
    private static games: Game[];
    private static pendingUser: Player | undefined;

    constructor() {
        GameManager.players = [];
        GameManager.games = [];
        GameManager.pendingUser = undefined;
    }

    public addPlayer(ws: WebSocket) {
        const player = new Player(ws);
        GameManager.players.push(player);
        this.addHandler(player);
    }

    public removePlayer(ws: WebSocket) {
        GameManager.players = GameManager.players.filter(player => player.ws !== ws);
        //stop his game
        const gameIndex = GameManager.games.findIndex(game => game.whitePlayer.ws === ws || game.blackPlayer.ws === ws);
        if (gameIndex !== -1) {
            const game = GameManager.games[gameIndex];
            if (game.whitePlayer.ws === ws) {
                game.blackPlayer.ws.send(JSON.stringify({ type: "error", message: "Opponent left the game." }));
            } else {
                game.whitePlayer.ws.send(JSON.stringify({ type: "error", message: "Opponent left the game." }));
            }
            GameManager.games.splice(gameIndex, 1);
        }
    }

    public addHandler(player: Player) {
        player.ws.on("message", (message) => {
            const messageData = JSON.parse(message.toString());

            if (messageData.type === Init_Game) {
                //a user is in the queue
                //start the game 
                if(GameManager.pendingUser) {
                    const game = new Game(GameManager.pendingUser, player);
                    GameManager.games.push(game);

                    //add game object to both players
                    GameManager.pendingUser.game = game;
                    player.game = game;
                    GameManager.pendingUser = undefined;
                }
                //join the queue for matching
                else {
                    GameManager.pendingUser = player;
                }
            }
            if (messageData.type === Move) {
                const move = messageData.data;
                const game = GameManager.games.find(g => g.whitePlayer.ws === player.ws || g.blackPlayer.ws === player.ws);
                if (game) {
                    game.makeMove(player.ws, move);
                } else {
                    player.ws.send(JSON.stringify({ type: "error", message: "You are not in a game." }));
                }
            }
        });
    }
}