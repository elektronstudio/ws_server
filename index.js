const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

const removeFromArray = (arr, callback) => {
  const index = arr.findIndex(callback);
  if (index > -1) {
    return arr.splice(index, 1);
  }
};

const channels = {};

const updateUsername = (channels, userid, username) =>
  Object.fromEntries(
    Object.entries(channels).map(([key, values]) => {
      const updatedValues = values.map((v) => {
        if (v.userid === userid) {
          v.username = username;
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
      channels = updateUsername(channels, m.userid, m.username);
    }
    if (m && m.channel && m.type === "joinchannel") {
      if (!channels[m.channel]) {
        channels[m.channel] = [];
      }
      if (!channels[m.channel].map(({ userid }) => userid).includes(m.userid)) {
        channels[m.channel].push({ userid: m.userid, username: m.username });
        newMessage = JSON.stringify(
          createMessage({
            type: "channels",
            value: channels,
          })
        );
      }
    }
    if (m && m.channel && m.type === "leavechannel") {
      if (
        channels[m.channel] &&
        channels[m.channel].map(({ userid }) => userid).includes(m.userid)
      ) {
        removeFromArray(
          channels[m.channel],
          (user) => user.userid === m.userid
        );
        newMessage = JSON.stringify(
          createMessage({
            type: "channels",
            value: channels,
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
    userid: "",
    username: "",
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
