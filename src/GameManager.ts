import { WebSocket } from "ws";
import { Game, Player } from "./Game";
import { Game_Started, Init_Game, Move, Player_Joined, Set_Name } from "./messages";

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

    public addPlayer(ws: WebSocket) {
        const player = new Player(ws);
        GameManager.players.push(player);
        ws.send(JSON.stringify({message: `Player ${++GameManager.playersCount} connected, give your name : `}));
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

        // player.ws.on("open", () => {
        //     console.log(`Player ${player.name} connected, ab kuch message to bhejo`);
        //     // player.ws.send(JSON.stringify({ type: "init" }));
        // });
        player.ws.on("message", (message) => {
            const messageData = JSON.parse(message.toString());
            
            //setting player name
            if(messageData.type === Set_Name) {
                player.name = messageData.data;
                player.ws.send(JSON.stringify({message: `Hello ${player.name}`}));
                GameManager.players.forEach(p => {
                    if(p.ws !== player.ws) {
                        p.ws.send(JSON.stringify({ type: Player_Joined, payload: player.name }));
                    }
                });
            }

            //enter a game
            if (messageData.type === Init_Game) {
                //a user is in the queue
                //start the game 
                if(GameManager.pendingUser) {
                    const game = new Game(GameManager.pendingUser, player);
                    GameManager.games.push(game);

                    //add game object to both players
                    GameManager.pendingUser.game = game;
                    player.game = game;
                    
                    // player.ws.send(JSON.stringify({ type: Game_Started, payload: game.board.fen() }));
                    player.ws.send(JSON.stringify({ type: Game_Started, payload: game.board.fen(), message: `The Culling Games are starting and you are assigned Black. Good luck ${player.name}!` }));
                    GameManager.pendingUser.ws.send(JSON.stringify({ type : Game_Started, payload: game.board.fen(), message: `The Culling Games are starting and you are assigned White. Best of Luck ${GameManager.pendingUser.name}!` }));
                    GameManager.pendingUser = undefined;
                }
                //join the queue for matching
                else {
                    GameManager.pendingUser = player;
                    player.ws.send(JSON.stringify({ message: "Waiting for your opponent to join the Culling games..."}));
                }
            }

            //making moves
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