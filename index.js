const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

let channels = [];
let users = [];
let messages = [];

// const ttlInitial = 60;
// const ttlStep = 10;

const addUserToChannel = (userId, channelId) => {
  const channelIndex = channels.findIndex(
    ({ channel }) => channel === channelId
  );
  if (channelIndex > -1) {
    if (!channels[channelIndex].userIds.includes(userId)) {
      channels[channelIndex].userIds.push(userId);
    }
  } else {
    channels.push({ channel: channelId, userIds: [userId] });
  }
};

const removeUserFromChannel = (userId, channelId) => {
  const channelIndex = channels.findIndex(
    ({ channel }) => channel === channelId
  );
  if (channelIndex > -1 && channels[channelIndex].userIds) {
    const userIndex = channels[channelIndex].userIds.findIndex(
      (id) => id === userId
    );
    channels[channelIndex].userIds = channels[channelIndex].userIds.slice(
      0,
      userIndex
    );
  }
};

const upsertUser = (user) => {
  delete user.channel;
  const existingUserIndex = users.findIndex(
    ({ userId }) => userId === user.userId
  );
  const existingUser = users[existingUserIndex];
  if (existingUserIndex > -1) {
    users[existingUserIndex] = {
      ...existingUser,
      ...user,
    };
  } else {
    users.push({ ...user });
  }
};

// const mergeChannelsAndUsers = () =>
//   Object.fromEntries(
//     channels.map((channel) => {
//       channel.users = channel.userIds
//         .map((userId) => {
//           const user = users.find((u) => u.userId === userId);
//           if (user) {
//             delete user.channel;
//           }
//           return user ? user : null;
//         })
//         .filter((user) => user);
//       return [channel.channel, channel.users];
//     })
//   );

// const ttlUpdateUsers = () => {
//   users = users.map((user) => {
//     user.ttl = user.ttl > 0 ? user.ttl - ttlStep : 0;
//     return user;
//   });
// };

// setInterval(() => {
//   ttlUpdateUsers();
//   console.log(users);
// }, 5000);

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    let newMessage = null;
    const m = safeJsonParse(message);

    if (m && m.type === "CHAT") {
      if (m.value === "/reset") {
        messages = [];
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

    if (m && m.type === "CHANNEL_JOIN") {
      let { id, type, datetime, value, ...user } = m;

      addUserToChannel(m.userId, m.channel);
      upsertUser({ ...user });

      newMessage = createMessage({
        type: "CHANNELS_UPDATE",
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
      let { id, type, datetime, value, ...user } = m;

      removeUserFromChannel(m.userId, m.channel);
      upsertUser({ ...user });

      newMessage = createMessage({
        type: "CHANNELS_UPDATE",
        value: channels,
      });
    }

    if (m && m.type === "USER_UPDATE") {
      let { id, type, datetime, value, ...user } = m;
      addUserToChannel(m.userId, m.channel);
      upsertUser({ ...user, ...m.value });
      newMessage = createMessage({
        type: "USERS_UPDATE",
        value: users,
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
