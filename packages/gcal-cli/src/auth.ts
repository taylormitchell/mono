import fs from "fs";
import path from "path";
import { OAuth2Client } from "googleapis-common";
import open from "open";
import readline from "readline/promises";

const CONFIG_DIR = path.join(process.env.HOME!, ".config", "gcal-cli");
const TOKENS_PATH = path.join(CONFIG_DIR, "tokens.json");

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error("CLIENT_ID and CLIENT_SECRET must be set");
}
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks",
];

export async function getAuth(account: string = "default"): Promise<OAuth2Client> {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  let tokens: Record<string, any> = {};
  if (fs.existsSync(TOKENS_PATH)) {
    tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, "utf8"));
  }
  const oAuth2 = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, "urn:ietf:wg:oauth:2.0:oob");
  if (tokens[account]) {
    oAuth2.setCredentials(tokens[account]);
    return oAuth2;
  }
  // Device flow
  const authUrl = oAuth2.generateAuthUrl({ access_type: "offline", scope: SCOPES });
  console.log(`🔑  First‑time auth. Opening browser…`);
  await open(authUrl);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await rl.question("Paste the code here: ");
  rl.close();
  const { tokens: newTokens } = await oAuth2.getToken(code.trim());
  oAuth2.setCredentials(newTokens);
  tokens[account] = newTokens;
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  console.log("✅  Token stored.");
  return oAuth2;
}
