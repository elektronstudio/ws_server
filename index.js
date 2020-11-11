const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

let channels = {};
let users = {};
let messages = [];

const objectMap = (callback) =>
  Object.fromEntries(Object.entries(obj).map(callback));

const upsertUserInChannel = (user, channel) => {
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
};

const upsertUserInAllChannels = (user) => {
  channels = objectMap((channel) => {
    channel.users = objectMap((user) => {
      if (user.channel) {
        delete user.channel;
      }
      if (user.userId === user.userId) {
        user = { ...user, ...user };
      }
      return user;
    });
    return channel;
  });
};

const removeUserInChannel = (user, channel) => {
  if (channels[channel] && channels[channel].users[user.userId]) {
    delete channels[channel].users[user.userId];
  }
};

const upsertUser = (user) => {
  delete user.channel;
  if (!users[user.userId]) {
    users[user.userId] = user;
  } else {
    users[user.userId] = {
      ...users[user.userId],
      ...user,
    };
  }
};

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    let newMessage = [];
    const m = safeJsonParse(message);

    if (m && m.type === "CHAT") {
      // if (m.value === "/reset") {
      //   messages = [];
      //   users = [];
      //   channels = [];
      //   newMessage = createMessage({
      //     type: "USERS_UPDATE",
      //     value: users,
      //   });
      //   newMessage = createMessage({
      //     type: "CHANNELS_UPDATE",
      //     value: channels,
      //   });
      //   // TODO Send more resets
      // } else {
      messages.push(m);
      //}
    }

    if (m && m.type === "CHANNEL_JOIN") {
      const user = { userId: m.userId, ...m.value };
      upsertUserInChannel(user);
      newMessage = createMessage({
        type: "CHANNEL_UPDATE",
        channel: m.channel,
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
        }
      });
    }

    if (m && m.type === "CHANNEL_LEAVE") {
      removeUserFromChannel(m.userId, m.channel);

      newMessage = createMessage({
        type: "CHANNEL_UPDATE",
        value: channels[m.channel],
      });
    }

    if (m && m.type === "USER_UPDATE") {
      const user = { userId: m.userId, ...m.value };
      //upsertUser(user); // TODO: Do we need it?
      upsertUserInAllChannels(user);

      newMessage = createMessage({
        type: "CHANNELS_UPDATE",
        value: channels,
      });
      // TODO: USERS_UPDATE - Do we need it?
    }

    if (m && m.type === "CHANNEL_USER_UPDATE") {
      upsertUserInChannel({ userId: m.userId, ...m.value }, m.channel);
      newMessage = createMessage({
        type: "CHANNELS_UPDATE",
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
