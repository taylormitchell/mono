import dotenv from "dotenv";
const envDir = "../";
// Load the .env file
dotenv.config({ path: envDir + ".env" });
// Load the .env.production or .env.development file
dotenv.config({
  path: envDir + (process.env.NODE_ENV === "production" ? ".env.production" : ".env.development"),
});
