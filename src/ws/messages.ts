export enum MessageTypes {
    Player_Joined = "PlayerJoined",
    Player_Left = "PlayerLeft",
    Set_Name = "SetName",
    Move= "Move",
    Init_Game = "InitGame",
    Game_Started = "GameStarted",
    Game_Over = "GameOver",
    Game_Resumed = "GameResumed",
    Game_Aborted = "GameAborted",
}

//users will send moves through the frontend in this json format
// {
// "type": "MOVE",
//   "payload": { "from": "e2", "to": "e4" }
// }
