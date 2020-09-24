### About

Websocket echo server

### Installation and running

```
npm install
node index.js
```

### Client API

#### Sending and receiving messages

By default, the websocket server works as a broadcast server: it relays all the received messages back to all conntected clients, including the original message sender.

```js
const socket = new WebSocket("wss://your-server-here");

// Using strings

socket.send("test");
socket.onmessage = ({ data }) => console.log(data); // "test"

// Using JSON

socket.send(JSON.stringify({ message: "test" }));
socket.onmessage = ({ data }) => console.log(JSON.parse(data)); // {message: "test"}
```

#### Requesting statistics

There a specific message format `{type: "statsRequest"}` that works in request-response mode and only will send stats data back to the message sender:

```js
const socket = new WebSocket("wss://your-server-here");

socket.send(JSON.stringify({type: "statsRequest"}));
socket.onmessage = ({ data } => console.log(JSON.parse(data));
// {type: "statsResponse", clientCount: 1}
```
