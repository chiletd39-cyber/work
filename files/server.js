// ============================================================
// server.js — Main Backend Entry Point
// Real-Time Chat App | Node.js + Express + Socket.io
// ============================================================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// ── 1. App & Server Setup ─────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ── 2. Serve Static Frontend Files ───────────────────────
app.use(express.static(__dirname));

// ── 3. In-Memory State ────────────────────────────────────
const users = {};         // { socketId: { username, room } }
const rooms = {};         // { roomName: Set of socketIds }
const messageHistory = {}; // { roomName: [ ...messages ] }

const DEFAULT_ROOM = "General";

// ── 4. Helper Functions ───────────────────────────────────

/** Add message to room history (keep last 50) */
function saveMessage(room, message) {
  if (!messageHistory[room]) messageHistory[room] = [];
  messageHistory[room].push(message);
  if (messageHistory[room].length > 50) messageHistory[room].shift();
}

/** Get list of usernames in a room */
function getRoomUsers(room) {
  if (!rooms[room]) return [];
  return [...rooms[room]].map((id) => users[id]?.username).filter(Boolean);
}

/** Join a room: add socket to room tracking */
function joinRoom(socket, room) {
  if (!rooms[room]) rooms[room] = new Set();
  rooms[room].add(socket.id);
  socket.join(room);
}

/** Leave a room: remove socket from room tracking */
function leaveRoom(socket, room) {
  if (rooms[room]) {
    rooms[room].delete(socket.id);
    if (rooms[room].size === 0) delete rooms[room];
  }
  socket.leave(room);
}

/** Format a timestamp */
function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── 5. Socket.io Events ───────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ----- EVENT: User joins with a username -----
  socket.on("user:join", ({ username, room = DEFAULT_ROOM }) => {
    // Validate username
    username = username?.trim().slice(0, 20);
    if (!username) {
      socket.emit("error:message", "Username cannot be empty.");
      return;
    }

    // Check for duplicate username in room
    const takenNames = getRoomUsers(room).map((n) => n.toLowerCase());
    if (takenNames.includes(username.toLowerCase())) {
      socket.emit("error:message", `Username "${username}" is already taken in this room.`);
      return;
    }

    // Save user info
    users[socket.id] = { username, room };

    // Join the room
    joinRoom(socket, room);

    console.log(`👤 "${username}" joined room: "${room}"`);

    // Send chat history to the new user
    socket.emit("chat:history", messageHistory[room] || []);

    // Confirm join to the user
    socket.emit("user:joined", { username, room });

    // Notify everyone else in the room
    const systemMsg = {
      type: "system",
      text: `${username} joined the chat`,
      timestamp: getTimestamp(),
    };
    saveMessage(room, systemMsg);
    socket.to(room).emit("chat:message", systemMsg);

    // Broadcast updated user list to the room
    io.to(room).emit("room:users", { room, users: getRoomUsers(room) });

    // Send available rooms list to everyone
    io.emit("rooms:list", Object.keys(rooms));
  });

  // ----- EVENT: Send a chat message -----
  socket.on("chat:send", ({ text }) => {
    const user = users[socket.id];
    if (!user) return;

    text = text?.trim();
    if (!text || text.length === 0) return;
    if (text.length > 500) {
      socket.emit("error:message", "Message too long (max 500 characters).");
      return;
    }

    const message = {
      type: "user",
      username: user.username,
      text,
      timestamp: getTimestamp(),
      socketId: socket.id,
    };

    saveMessage(user.room, message);

    // Broadcast to everyone in the room (including sender)
    io.to(user.room).emit("chat:message", message);

    console.log(`💬 [${user.room}] ${user.username}: ${text}`);
  });

  // ----- EVENT: Switch room -----
  socket.on("room:switch", ({ newRoom }) => {
    const user = users[socket.id];
    if (!user) return;

    newRoom = newRoom?.trim().slice(0, 30);
    if (!newRoom) return;
    if (newRoom === user.room) return;

    const oldRoom = user.room;

    // Leave old room
    leaveRoom(socket, oldRoom);
    const leaveMsg = {
      type: "system",
      text: `${user.username} left the chat`,
      timestamp: getTimestamp(),
    };
    saveMessage(oldRoom, leaveMsg);
    io.to(oldRoom).emit("chat:message", leaveMsg);
    io.to(oldRoom).emit("room:users", { room: oldRoom, users: getRoomUsers(oldRoom) });

    // Join new room
    user.room = newRoom;
    joinRoom(socket, newRoom);

    socket.emit("chat:history", messageHistory[newRoom] || []);
    socket.emit("user:joined", { username: user.username, room: newRoom });

    const joinMsg = {
      type: "system",
      text: `${user.username} joined the chat`,
      timestamp: getTimestamp(),
    };
    saveMessage(newRoom, joinMsg);
    io.to(newRoom).emit("chat:message", joinMsg);
    io.to(newRoom).emit("room:users", { room: newRoom, users: getRoomUsers(newRoom) });

    io.emit("rooms:list", Object.keys(rooms));

    console.log(`🔀 "${user.username}" switched from "${oldRoom}" to "${newRoom}"`);
  });

  // ----- EVENT: Typing indicator -----
  socket.on("user:typing", (isTyping) => {
    const user = users[socket.id];
    if (!user) return;
    socket.to(user.room).emit("user:typing", { username: user.username, isTyping });
  });

  // ----- EVENT: Disconnection -----
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      console.log(`❌ "${user.username}" disconnected`);

      leaveRoom(socket, user.room);

      const leaveMsg = {
        type: "system",
        text: `${user.username} left the chat`,
        timestamp: getTimestamp(),
      };
      saveMessage(user.room, leaveMsg);
      io.to(user.room).emit("chat:message", leaveMsg);
      io.to(user.room).emit("room:users", { room: user.room, users: getRoomUsers(user.room) });
      io.emit("rooms:list", Object.keys(rooms));

      delete users[socket.id];
    } else {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    }
  });
});

// ── 6. Start Server ───────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚀 Chat server running at http://localhost:${PORT}\n`);
});
