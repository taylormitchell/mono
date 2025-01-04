import "dotenv/config";
import { Request, Response, NextFunction } from "express";

import jwt from "jsonwebtoken";

function getSecretKey() {
  const SECRET_KEY = process.env.JWT_SECRET_KEY;
  if (!SECRET_KEY) {
    throw new Error("JWT_SECRET_KEY is not set in the environment variables");
  }
  return SECRET_KEY;
}

export function generateJwt() {
  const payload = {
    email: "taylor.j.mitchell@gmail.com",
  };
  return jwt.sign(payload, getSecretKey());
}

export function verifyJwt(token: string) {
  return jwt.verify(token, getSecretKey());
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.AUTH_DISABLED === "true") {
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
