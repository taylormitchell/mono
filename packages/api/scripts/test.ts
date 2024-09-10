import dotenv from "dotenv";
import { generateJwt } from "../src/jwt";
import { format } from "date-fns-tz";

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
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
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

const date = new Date("2024-09-09T18:04:03-06:00");
console.log(format(date, "yyyy-MM-dd'T'HH:mm:ssxxx", { timeZone: "Canada/Eastern" }));
