import dotenv from "dotenv";
// Load the .env from the project root
dotenv.config({ path: "../.env" });
// Load the .env.production or .env.development file
dotenv.config({
  path: "../" + (process.env.NODE_ENV === "production" ? ".env.production" : ".env.development"),
});
