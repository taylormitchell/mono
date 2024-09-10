// const apiUrl = "http://localhost:3077";
const apiUrl = "http://3.92.45.253";

async function sync() {
  const res = await fetch(`${apiUrl}/api/git/sync`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + process.env.API_KEY,
    },
  });
  const data = await res.json();
  console.log(data);
}

async function appendToKids() {
  const res = await fetch(`${apiUrl}/api/files/kids.md`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.API_KEY,
    },
    body: JSON.stringify({
      method: "append",
      content: "test",
    }),
  });
  const data = await res.json();
  console.log(data);
}

sync();
