const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

const removeFromArray = (arr, callback) => {
  const index = arr.findIndex(callback);
  if (index > -1) {
    return arr.splice(index, 1);
  }
};

const channelsInfo = [];

const updateUsername = (channelsInfo, userId, userName) =>
  Object.fromEntries(
    Object.entries(channelsInfo).map(([key, values]) => {
      const updatedValues = values.map((v) => {
        if (v.userId === userId) {
          v.userName = userName;
        }
      });
      return [key, updatedValues];
    })
  );

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    let newMessage = null;
    const m = safeJsonParse(message);
    if (m && m.channel && m.type === "updateUsername") {
      channelsInfo = updateUsername(channelsInfo, m.userId, m.userName);
    }
    if (m && m.channel && m.type === "joinChannel") {
      if (!channelsInfo[m.channel]) {
        channelsInfo[m.channel] = [];
      }
      if (
        !channelsInfo[m.channel].map(({ userId }) => userId).includes(m.userId)
      ) {
        channelsInfo[m.channel].push({
          userId: m.userId,
          userName: m.userName,
        });
        newMessage = JSON.stringify(
          createMessage({
            type: "channelsInfo",
            value: channelsInfo,
          })
        );
      }
    }
    if (m && m.channel && m.type === "leaveChannel") {
      if (
        channelsInfo[m.channel] &&
        channelsInfo[m.channel].map(({ userId }) => userId).includes(m.userId)
      ) {
        removeFromArray(
          channelsInfo[m.channel],
          (user) => user.userId === m.userId
        );
        newMessage = JSON.stringify(
          createMessage({
            type: "channelsInfo",
            value: channelsInfo,
          })
        );
      }
    }
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        if (newMessage) {
          client.send(newMessage);
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

const createMessage = (message) => {
  return {
    id: randomId(),
    datetime: new Date().toISOString(),
    type: "",
    channel: "",
    userId: "",
    userName: "",
    value: "",
    ...message,
  };
};

const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

// Strings

const randomId = (length = 16) => {
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  return shuffle(letters).slice(0, length).join("");
};
