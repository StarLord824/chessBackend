import { Router, Request, Response } from "express";
import { prisma } from "../Singleton";

const userRouter = Router();

userRouter.get("/", (req: Request, res: Response) => {
  res.send("Users");
});


userRouter.get("/:id", async (req: Request, res: Response) => {
  //returns the user data of the logged in user
  try {
    // const { email } = req.body.user;
    const user = await prisma.user.findUnique({
      where: { id : req.params.id }, // email first
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        rating: true,
        matchesWon: true,
        matchesBlack: true,
        matchesWhite: true,
      }
    });

    if (!user) res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    // console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Update user info (username, name, avatar)
userRouter.put("/:id", async (req: Request, res: Response) => {
  const { name, username, image } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, username, image }
    });
    res.json(updated);
  } catch (err: any) {
    if (err.code === "P2002") {
      res.status(400).json({ error: "Username already taken" });
    }
    res.status(500).json({ error: "Server error", details: err });
  }
});

export default userRouter;