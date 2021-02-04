const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

let channels = {};
let messages = [];
let likes = [];

const objectMap = (obj, callback) =>
  Object.fromEntries(Object.entries(obj).map(callback));

const upsertUserInChannel = (user, channel) => {
  if (user && user.userId && channel) {
    if (!channels[channel]) {
      channels[channel] = { users: {} };
    }
    if (user.channel) {
      delete user.channel;
    }
    const existingUser = channels[channel].users[user.userId];
    if (!user) {
      channels[channel].users[user.userId] = user;
    } else {
      channels[channel].users[user.userId] = { ...existingUser, ...user };
    }
    if (channels[channel].users[user.userId].userId) {
      delete channels[channel].users[user.userId].userId;
    }
  }
};

const upsertUserInAllChannels = (user) => {
  if (user && user.userId) {
    channels = objectMap(channels, ([channelId, channel]) => {
      channel.users = objectMap(
        channel.users,
        ([existingUserId, existingUser]) => {
          if (existingUserId === user.userId) {
            existingUser = { ...existingUser, ...user };
            delete existingUser.channel;
            delete existingUser.userId;
          }
          return [existingUserId, existingUser];
        }
      );
      return [channelId, channel];
    });
  }
};

const removeUserInChannel = (user, channel) => {
  if (channels[channel] && channels[channel].users[user.userId]) {
    delete channels[channel].users[user.userId];
  }
};

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    let newMessage = [];
    const m = safeJsonParse(message);

    if (m && m.type === "RESET") {
      channels = {};
      messages = [];
      newMessage = createMessage({
        type: "CHANNELS_UPDATED",
        value: channels,
      });
    }

    if (m && m.type === "CHAT") {
      if (m.value === "/reset") {
        messages = [];
        likes = [];
        users = [];
        channels = [];
        newMessage = createMessage({
          type: "USERS_UPDATE",
          value: users,
        });
        newMessage = createMessage({
          type: "CHANNELS_UPDATE",
          value: channels,
        });
        // TODO Send more resets
      } else {
        messages.push(m);
      }
    }

    if (m && m.type === "LIKE") {
      likes.push(m);
    }

    if (m && m.type === "CHANNEL_JOIN") {
      const user = { userId: m.userId, userName: m.userName };
      upsertUserInChannel(user, m.channel);
      newMessage = createMessage({
        type: "CHANNELS_UPDATED",
        value: channels,
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
          client.send(
            createMessage({
              type: "LIKE_SYNC",
              channel: m.channel,
              value: likes.filter(({ channel }) => channel === m.channel),
            })
          );
        }
      });
    }

    if (m && m.type === "CHANNEL_LEAVE") {
      const user = { userId: m.userId };
      removeUserInChannel(user, m.channel);

      newMessage = createMessage({
        type: "CHANNELS_UPDATED",
        value: channels,
      });
    }

    if (m && m.type === "USER_UPDATE") {
      const user = { userId: m.userId, ...m.value };
      upsertUserInAllChannels(user);
      newMessage = createMessage({
        type: "CHANNELS_UPDATED",
        value: channels,
      });
    }

    if (m && m.type === "CHANNEL_USER_UPDATE") {
      const user = { userId: m.userId, ...m.value };
      upsertUserInChannel(user, m.channel);

      newMessage = createMessage({
        type: "CHANNELS_UPDATED",
        value: channels,
      });
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

// Utlities

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (err) {
    return null;
  }
}

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
