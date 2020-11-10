const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

const hasValue = (arr, key, value) => arr.find((item) => item[key] === value);

const removeFromArray = (arr, callback) => {
  const index = arr.findIndex(callback);
  if (index > -1) {
    return arr.splice(index, 1);
  }
};

let channels = [];
let users = [];
let messages = [];

const ttlInitial = 60; // 1 min
const ttlStep = 10;

// const updateUsername = (channels, userId, userName) =>
//   Object.fromEntries(
//     Object.entries(channels).map(([channelKey, channelData]) => {
//       const updatedchannels = channelData.channels.map((u) => {
//         if (u.userId === userId) {
//           u.userName = userName;
//         }
//         return u;
//       });
//       return [channelKey, { ...channelData, channels: updatedchannels }];
//     })
//   );

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

const upsertUser = (user) => {
  const existingUserIndex = users.findIndex(
    ({ userId }) => userId === user.userId
  );
  const existingUser = users[existingUserIndex];
  if (existingUserIndex > -1) {
    users[existingUserIndex] = {
      ...existingUser,
      ...user,
      ttl: ttlInitial,
    };
  } else {
    users.push({ ...user, ttl: ttlInitial });
  }
};

const updateUsersTtl = () => {
  users = users.map((user) => {
    user.ttl = user.ttl > 0 ? user.ttl - ttlStep : 0;
    return user;
  });
};

const mergeChannelsAndUsers = () =>
  Object.fromEntries(
    channels.map((channel) => {
      channel.users = channel.userIds
        .map((userId) => {
          const user = users.find((u) => u.userId === userId);
          if (user) {
            delete user.channel;
          }
          return user ? user : null;
        })
        .filter((user) => user);
      return [channel.channel, { users: channel.users }];
    })
  );
//const = (update) => {

// const user = update();
// if (user.userId && user.channel && !channels[user.channel]) {
//   channels[user.channel] = { [user.userId]: user };
//   console.log("new");
// } else {
//   console.log("new");
//   channels = Object.fromEntries(
//     Object.entries(channels).map(([channelKey, users]) => {
//       if (!users) {
//         users = {};
//       }
//       if (!users[update().userId]) {
//         users[user.userId] = user;
//         delete users[user.userId].userId;
//       } else {
//         const updatedChannel = channelData.users.map((u) => {
//           const updatedUser = updateUser(u);
//           if (u.userId === updatedUser.userId) {
//             u = { ...u, ...updatedUser };
//           }
//           return u;
//         });
//       }
//       return [channelKey, users];
//     })
//   );
// }
//};

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    let newMessage = null;
    const m = safeJsonParse(message);

    if (m && m.type === "CHAT") {
      if (m.value === "/clean") {
        messages = messages.filter(({ channel }) => channel === m.channel);
      } else {
        messages.push(m);
      }
    }

    // if (m && m.type === "USERNAME_UPDATE") {
    //   channels = updateUsername(channels, m.userId, m.userName);
    //   newMessage = createMessage({
    //     type: "CHANNEL_INFO",
    //     value: channels,
    //   });
    // }

    if (m && m.type === "USER_UPDATE") {
      let { id, type, datetime, value, ...user } = m;
      addUserToChannel(m.userId, m.channel);
      upsertUser({ ...user, ...m.value });
      newMessage = createMessage({
        type: "CHANNELS_UPDATE",
        value: mergeChannelsAndUsers(),
      });
      // channels = updateUser((user) => ({
      //   userId: m.userId,
      //   userName: m.userName,
      //   ttl: user && user.ttl ? user.ttl - ttlStep : ttlInitial,
      // }));
      //console.log(channels);
      // newMessage = createMessage({
      //   type: "CHANNELS_UPDATE",
      //   value: channels,
      // });
    }

    // if (m && m.channel && m.type === "USER_") {
    //   if (!channels[m.channel]) {
    //     channels[m.channel] = { users: {} };
    //   }
    //   if (
    //     channels[m.channel].channels &&
    //     !channels[m.channel].channels
    //       .map(({ userId }) => userId)
    //       .includes(m.userId)
    //   ) {
    //     channels[m.channel].channels.push({
    //       userId: m.userId,
    //       userName: m.userName,
    //     });
    //     newMessage = createMessage({
    //       type: "channels",
    //       value: channels,
    //     });

    //     wss.clients.forEach((client) => {
    //       if (client.readyState === WebSocket.OPEN && client === ws) {
    //         client.send(
    //           createMessage({
    //             type: "CHATS",
    //             channel: m.channel,
    //             value: messages.filter(({ channel }) => channel === m.channel),
    //           })
    //         );
    //       }
    //     });
    //   }
    // }

    // if (m && m.channel && m.type === "CHANNEL_LEAVE") {
    //   if (
    //     channels[m.channel] &&
    //     channels[m.channel].channels &&
    //     channels[m.channel].channels.map(({ userId }) => userId).includes(m.userId)
    //   ) {
    //     removeFromArray(
    //       channels[m.channel].channels,
    //       (user) => user.userId === m.userId
    //     );
    //     newMessage = createMessage({
    //       type: "CHANNEL_INFO",
    //       value: channels,
    //     });
    //   }
    // }

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

// setInterval(() => {
//   updateUsersTtl();
//   console.log(users);
// }, 5000);

// setInterval(() => {
//   Object.entries(channels).forEach(([_, channel]) => {
//     Object.entries(channel).forEach(([_, { userId }]) => {
//       channels = updateUser(({ ttl }) => ({
//         userId,
//         ttl: ttl - ttlStep,
//       }));
//     });
//   });
// }, ttlStep * 100);

// Utlities

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
