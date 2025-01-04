import { Router, Request, Response } from "express";
import { getDb, resetDb, summary } from "../db";
import { handlePush, handlePull } from "../lib/replicache";
import { authMiddleware } from "../lib/auth";
import { todo } from "src/db/schema";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  res.status(200).json(await summary());
});

router.get("/dump", async (req: Request, res: Response) => {
  const db = await getDb();
  const todos = db.select().from(todo).all();
  res.status(200).json(todos);
});

router.post("/push", authMiddleware, handlePush);
router.post("/pull", authMiddleware, handlePull);

router.use("/reset", authMiddleware, async (req: Request, res: Response) => {
  resetDb();
  res.status(200).json({ message: "Database reset" });
});

export default router;
