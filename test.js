const WebSocket = require("ws");

const ws = new WebSocket("http://localhost:8080");

// ws.on("message", (data) => {
//   console.log(data);
// });

ws.on("open", async function () {
  const m = createMessage({
    type: "USER_UPDATE",
    channel: "haam",
    userId: "asdada",
    userName: "Mako",
    locationX: 100,
  });
  ws.send(m);

  const m2 = createMessage({
    type: "USER_UPDATE",
    channel: "haam",
    userId: "asdadaaa",
    userName: "Makoooo",
    locationX: 100,
  });
  ws.send(m2);

  const m3 = createMessage({
    type: "USER_UPDATE",
    channel: "jaa",
    userId: "asdada",
    userName: "Mako",
    locationX: 100,
  });

  setTimeout(() => ws.send(m3), 2000);
});

const createMessage = (message) => {
  const id = "abcdefghijklmnopqrstuvwxyz"
    .split("")
    .sort(() => Math.random() - 0.5)
    .slice(0, 16)
    .join("");
  return JSON.stringify({
    id,
    datetime: new Date().toISOString(),
    type: "",
    channel: "",
    userId: "",
    userName: "",
    value: "",
    ...message,
  });
};
