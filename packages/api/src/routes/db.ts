import { Router, Request, Response } from "express";
import { getServerVersion } from "../db";
import { handlePush, handlePull } from "../replicache";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/version", (req: Request, res: Response) => {
  const version = getServerVersion();
  if (!version) {
    return res.status(500).json({ error: "Server version not found" });
  }
  res.status(200).json({
    version,
  });
});

router.post("/push", authMiddleware, handlePush);
router.post("/pull", authMiddleware, handlePull);

router.use("/reset", authMiddleware, async (req: Request, res: Response) => {
  await resetDB();
  res.status(200).json({ message: "Database reset" });
});

export default router;
