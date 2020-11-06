const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

const removeFromArray = (arr, callback) => {
  const index = arr.findIndex(callback);
  if (index > -1) {
    return arr.splice(index, 1);
  }
};

let channelInfo = {};
let messages = [];

const updateUser = (channelInfo, userId, key, value) =>
  Object.fromEntries(
    Object.entries(channelInfo).map(([channelKey, channelData]) => {
      const updatedUsers = channelData.users.map((u) => {
        if (u.userId === userId) {
          u[key] = value;
        }
        return u;
      });
      return [channelKey, { ...channelData, users: updatedUsers }];
    })
  );

const updateUser2 = (channelInfo, userId, newUser) =>
  Object.fromEntries(
    Object.entries(channelInfo).map(([channelKey, channelData]) => {
      const updatedUsers = channelData.users.map((u) => {
        if (u.userId === userId) {
          u = { ...u, ...newUser };
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
    if (m && m.type === "CHAT") {
      if (m.value === "/clear") {
        messages = [];
      } else {
        messages.push(m);
      }
    }
    if (m && m.type === "USERNAME_UPDATE") {
      channelInfo = updateUser(channelInfo, m.userId, "userName", m.userName);
      newMessage = createMessage({
        type: "CHANNEL_INFO",
        value: channelInfo,
      });
    }
    if (m && m.type === "USER_UPDATE") {
      channelInfo = updateUser2(channelInfo, m.userId, m.value);
      newMessage = createMessage({
        type: "CHANNEL_INFO",
        value: channelInfo,
      });
    }
    if (m && m.channel && m.type === "CHANNEL_JOIN") {
      if (!channelInfo[m.channel]) {
        channelInfo[m.channel] = { users: [] };
      }
      if (
        channelInfo[m.channel].users &&
        !channelInfo[m.channel].users
          .map(({ userId }) => userId)
          .includes(m.userId)
      ) {
        channelInfo[m.channel].users.push(m.value);
        newMessage = createMessage({
          type: "CHANNEL_INFO",
          value: channelInfo,
        });

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && client === ws) {
            client.send(
              createMessage({
                type: "CHAT_SYNC",
                channel: m.channel,
                value: messages.filter(({ channel }) => channel === m.channel),
              })
            );
          }
        });
      }
    }
    if (m && m.channel && m.type === "CHANNEL_LEAVE") {
      if (
        channelInfo[m.channel] &&
        channelInfo[m.channel].users &&
        channelInfo[m.channel].users
          .map(({ userId }) => userId)
          .includes(m.userId)
      ) {
        removeFromArray(
          channelInfo[m.channel].users,
          (user) => user.userId === m.userId
        );
        newMessage = createMessage({
          type: "CHANNEL_INFO",
          value: channelInfo,
        });
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
  return JSON.stringify({
    id: randomId(),
    datetime: new Date().toISOString(),
    type: "",
    channel: "",
    userId: "",
    userName: "",
    value: "",
    ...message,
  });
};

const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

// Strings

const randomId = (length = 16) => {
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  return shuffle(letters).slice(0, length).join("");
};
