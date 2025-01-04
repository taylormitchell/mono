import { Router, Request, Response } from "express";
import { getServerVersion, resetDb } from "../db";
import { handlePush, handlePull } from "../lib/replicache";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/version", (req: Request, res: Response) => {
  const version = getServerVersion();
  if (!version) {
    return res.status(500).json({ error: "Server version not found" });
  }
  res.status(200).json({ version });
});

router.post("/push", authMiddleware, handlePush);
router.post("/pull", authMiddleware, handlePull);

router.use("/reset", authMiddleware, async (req: Request, res: Response) => {
  resetDb();
  res.status(200).json({ message: "Database reset" });
});

export default router;
