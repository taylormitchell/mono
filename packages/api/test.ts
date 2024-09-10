async function sync() {
  const res = await fetch("http://localhost:3077/api/git/sync", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + process.env.API_KEY,
    },
  });
  const data = await res.json();
  console.log(data);
}

async function appendToKids() {
  const res = await fetch("http://localhost:3077/api/files/kids.md", {
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
