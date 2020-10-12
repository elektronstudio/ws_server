const WebSocket = require("ws");
const { App } = require("@tinyhttp/app");

const app = new App();
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const d = safeJsonParse(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        if (d && d.type === "statsRequest") {
          if (client === ws) {
            client.send(
              JSON.stringify({
                type: "statsResponse",
                clientsCount: wss.clients.size,
              })
            );
          }
        } else {
          client.send(data);
        }
      }
    });
  });
});

app
  .get("/stats", (_, res) => {
    res.json({ clientsCount: wss.clients.size });
  })
  .listen(8081);

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (err) {
    return null;
  }
}
