const WebSocket = require("ws");

const ws = new WebSocket("http://localhost:8080");

ws.on("message", (data) => {
  console.log(JSON.stringify(JSON.parse(data), null, 2));
  console.log("------------------");
});
/*
ws.on("open", async function () {
  const m = createMessage({
    type: "CHANNEL_JOIN",
    channel: "first",
    userId: "mako",
    userName: "Mako",
  });
  ws.send(m);

  const m2 = createMessage({
    type: "CHANNEL_JOIN",
    channel: "first",
    userId: "koko",
    userName: "Koko",
  });
  ws.send(m2);

  const m3 = createMessage({
    type: "CHANNEL_USER_UPDATE",
    channel: "first",
    userId: "mako",
    value: { userName: "Macarena", locationX: 100 },
  });
  ws.send(m3);

  const m4 = createMessage({
    type: "CHANNEL_JOIN",
    channel: "second",
    userId: "koko",
    userName: "Koko",
  });
  ws.send(m4);

  const m5 = createMessage({
    type: "USER_UPDATE",
    userId: "koko",
    value: { userName: "Kokoburra", locationY: 100 },
  });
  ws.send(m5);

  // const m3 = createMessage({
  //   type: "CHANNEL_LEAVE",
  //   channel: "haam",
  //   userId: "asdada",
  //   userName: "Mako",
  //   locationX: 100,
  // });

  // setTimeout(() => ws.send(m3), 2000);
});
*/

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
