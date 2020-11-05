const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

const removeFromArray = (arr, callback) => {
  const index = arr.findIndex(callback);
  if (index > -1) {
    return arr.splice(index, 1);
  }
};

let channelsInfo = {};

const updateUsername = (channelsInfo, userId, userName) =>
  Object.fromEntries(
    Object.entries(channelsInfo).map(([channelKey, channelData]) => {
      const updatedUsers = channelData.users.map((u) => {
        if (u.userId === userId) {
          u.userName = userName;
        }
        return u;
      });
      return [channelKey, { ...channelData, users: updatedUsers }];
    })
  );

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    let newMessage = null;
    const m = safeJsonParse(message);
    if (m && m.type === "updateUsername") {
      channelsInfo = updateUsername(channelsInfo, m.userId, m.userName);
      newMessage = JSON.stringify(
        createMessage({
          type: "channelsInfo",
          value: channelsInfo,
        })
      );
      console.log(newMessage);
    }
    if (m && m.channel && m.type === "joinChannel") {
      if (!channelsInfo[m.channel]) {
        channelsInfo[m.channel] = { users: [] };
      }
      if (
        channelsInfo[m.channel].users &&
        !channelsInfo[m.channel].users
          .map(({ userId }) => userId)
          .includes(m.userId)
      ) {
        channelsInfo[m.channel].users.push({
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
        channelsInfo[m.channel].users &&
        channelsInfo[m.channel].users
          .map(({ userId }) => userId)
          .includes(m.userId)
      ) {
        removeFromArray(
          channelsInfo[m.channel].users,
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
