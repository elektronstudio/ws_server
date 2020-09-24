const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const d = safeJsonParse(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        if (d && d.type === "statsRequest" && client === ws) {
          client.send(
            JSON.stringify({
              type: "statsResponse",
              clientsCount: wss.clients.size,
            })
          );
        } else {
          client.send(data);
        }
      }
    });
  });
});

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (err) {
    return null;
  }
}
