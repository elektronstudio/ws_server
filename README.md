### About

Websocket broadcasting server powering https://elektron.live

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

socket.send(JSON.stringify({ value: "test" }));
socket.onmessage = ({ data }) => console.log(JSON.parse(data)); //
```

...
