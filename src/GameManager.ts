import { WebSocket } from "ws";
import { Game, Player } from "./Game";

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
    }

    public addHandler(player: Player) {
        player.ws.on("message", (message) => {
            const messageData = JSON.parse(message.toString());

            if (messageData.type === "join") {
                if(GameManager.pendingUser) {
                    const game = new Game(GameManager.pendingUser, player);
                    GameManager.games.push(game);
                    GameManager.pendingUser = undefined;
                } else {
                    GameManager.pendingUser = player;
                }
            }

            if (messageData.type === "move") {
                const move = messageData.data;
                GameManager.games.forEach(game => {
                    game.makeMove(player.ws, move);
                });
            }
        });
    }

}