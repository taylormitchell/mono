import "dotenv/config";
import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../jwt";

const AUTH_DISABLED = process.env.AUTH_DISABLED === "true";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (AUTH_DISABLED) {
    next();
    return;
  }
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = auth.split(" ")[1];
  try {
    verifyJwt(token);
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
