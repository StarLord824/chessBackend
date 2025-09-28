import { Router, Request, Response } from "express";
import { prisma } from "../Singleton";
import { MatchStatus } from "@prisma/client";
import { Chess } from "chess.js";

const matchRouter = Router();

matchRouter.get("/", (req, res) => {
  res.send("Matches");
});

// Get a single match by ID
matchRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        white: true,
        black: true,
        winner: true
      }
    });
    if (!match) res.status(404).json({ error: "Match not found" });
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err });
  }
});

// Get all matches for a user
matchRouter.get("/user/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { whitePlayerId: userId },
          { blackPlayerId: userId }
        ]
      },
      orderBy: { createdAt: "desc" },
      include: { white: true, black: true, winner: true }
    });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err });
  }
});

// Create a new match manually (optional for testing)
matchRouter.post("/", async (req : Request, res : Response) => {
  const { whitePlayerId, blackPlayerId } = req.body;
  try {
    const match = await prisma.match.create({
      data: {
        whitePlayerId,
        blackPlayerId,
        status: MatchStatus.IN_PROGRESS,
        moves: [],
        fen: new Chess().fen(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err });
  }
});

// Resign a match
matchRouter.post("/:id/resign", async (req: Request, res: Response) => {
  const { playerId } = req.body;
  try {
    const match = await prisma.match.findUnique({ where: { id: Number(req.params.id) } });
    if (!match) res.status(404).json({ error: "Match not found" });
    else {
      const winnerId = match.whitePlayerId === playerId ? match.blackPlayerId : match.whitePlayerId;
      await prisma.match.update({
        where: { id: match.id },
        data: {
          status: MatchStatus.FINISHED,
          winnerId,
          result: match.whitePlayerId === playerId ? "0-1" : "1-0",
          endReason: "Resignation"
        }
      });
      res.json({ message: "Match resigned", winnerId });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err });
  }
});

export default matchRouter;
