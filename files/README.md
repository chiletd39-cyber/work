# 💬 LiveChat — Real-Time Chat Application

A full-stack real-time chat app built with **Node.js**, **Express.js**, and **Socket.io**.

---

## 📁 Project Structure

```
chat-app/
├── server.js          ← Backend: Express + Socket.io server
├── package.json       ← Dependencies
├── public/            ← Frontend (served statically)
│   ├── index.html     ← UI structure
│   ├── style.css      ← Styling
│   └── app.js         ← Client-side Socket.io logic
└── README.md
```

---

## 🚀 How to Run

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
node server.js
```
Or with auto-restart on file changes:
```bash
npm run dev
```

### 3. Open in browser
```
http://localhost:3000
```

Test with multiple tabs to simulate multiple users!

---

## ✅ Features

| Feature | Status |
|---|---|
| Real-time messaging | ✅ |
| Multiple users | ✅ |
| Join / Leave notifications | ✅ |
| Multiple chat rooms | ✅ |
| Message timestamps | ✅ |
| Typing indicators | ✅ |
| Chat history on join | ✅ |
| Duplicate username protection | ✅ |
| Responsive / mobile friendly | ✅ |
| Connection status indicator | ✅ |

---

## 🔌 Socket Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `user:join` | `{ username, room }` | Join chat with username |
| `chat:send` | `{ text }` | Send a message |
| `room:switch` | `{ newRoom }` | Switch to another room |
| `user:typing` | `Boolean` | Typing start/stop |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `user:joined` | `{ username, room }` | Confirm join |
| `chat:message` | `{ type, username, text, timestamp }` | New message |
| `chat:history` | `Array of messages` | Past messages on join |
| `room:users` | `{ room, users }` | Updated user list |
| `rooms:list` | `Array of room names` | All active rooms |
| `user:typing` | `{ username, isTyping }` | Typing indicator |
| `error:message` | `String` | Error feedback |

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js, Socket.io
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Real-time**: WebSockets via Socket.io
