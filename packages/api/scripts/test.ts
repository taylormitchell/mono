import dotenv from "dotenv";
import { generateJwt } from "../src/jwt";

dotenv.config();
// const apiUrl = "http://localhost:3077";
const apiUrl = "http://3.92.45.253";
const jwt = generateJwt();

async function sync() {
  const res = await fetch(`${apiUrl}/api/git/sync`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + jwt,
    },
  });
  const data = await res.json();
  console.log(data);
}

async function appendToKids() {
  const res = await fetch(`${apiUrl}/api/files/kids.md`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + jwt,
    },
    body: JSON.stringify({
      method: "append",
      content: "test",
    }),
  });
  try {
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.log(e);
    console.log(res);
  }
}

appendToKids();
