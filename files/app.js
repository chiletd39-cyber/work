// ============================================================
// app.js — Frontend Client Logic
// Real-Time Chat App | Socket.io Client
// ============================================================

// ── 1. Connect to Socket.io Server ───────────────────────
const socket = io();

// ── 2. DOM References ─────────────────────────────────────
const joinScreen          = document.getElementById("join-screen");
const chatScreen          = document.getElementById("chat-screen");

const usernameInput       = document.getElementById("username-input");
const roomInput           = document.getElementById("room-input");
const joinBtn             = document.getElementById("join-btn");
const joinError           = document.getElementById("join-error");

const messagesContainer   = document.getElementById("messages-container");
const messageInput        = document.getElementById("message-input");
const sendBtn             = document.getElementById("send-btn");
const typingIndicator     = document.getElementById("typing-indicator");

const currentRoomDisplay  = document.getElementById("current-room-display");
const myUsernameDisplay   = document.getElementById("my-username-display");
const onlineCount         = document.getElementById("online-count");
const usersList           = document.getElementById("users-list");
const roomsList           = document.getElementById("rooms-list");
const connectionStatus    = document.getElementById("connection-status");

const leaveBtn            = document.getElementById("leave-btn");
const newRoomInput        = document.getElementById("new-room-input");
const newRoomBtn          = document.getElementById("new-room-btn");
const sidebarToggle       = document.getElementById("sidebar-toggle");
const sidebar             = document.querySelector(".sidebar");

// ── 3. State ───────────────────────────────────────────────
let myUsername    = "";
let currentRoom   = "General";
let lastAuthor    = null;    // for grouping consecutive messages
let typingTimeout = null;
let isTyping      = false;

// ── 4. Show / Hide Screens ────────────────────────────────
function showScreen(screen) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  screen.classList.add("active");
}

// ── 5. JOIN LOGIC ──────────────────────────────────────────
joinBtn.addEventListener("click", handleJoin);
usernameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleJoin(); });
roomInput.addEventListener("keydown",     (e) => { if (e.key === "Enter") handleJoin(); });

function handleJoin() {
  const username = usernameInput.value.trim();
  const room     = roomInput.value.trim() || "General";

  if (!username) {
    joinError.textContent = "Please enter a username.";
    usernameInput.focus();
    return;
  }

  joinError.textContent = "";
  socket.emit("user:join", { username, room });
}

// ── 6. SEND MESSAGE LOGIC ──────────────────────────────────
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("chat:send", { text });
  messageInput.value = "";
  messageInput.focus();

  // Stop typing indicator when message is sent
  stopTyping();
}

// ── 7. TYPING INDICATOR ────────────────────────────────────
messageInput.addEventListener("input", () => {
  if (!isTyping) {
    isTyping = true;
    socket.emit("user:typing", true);
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 1500);
});

function stopTyping() {
  if (isTyping) {
    isTyping = false;
    socket.emit("user:typing", false);
  }
  clearTimeout(typingTimeout);
}

// ── 8. ROOM SWITCHING ─────────────────────────────────────
newRoomBtn.addEventListener("click", switchRoom);
newRoomInput.addEventListener("keydown", (e) => { if (e.key === "Enter") switchRoom(); });

function switchRoom() {
  const newRoom = newRoomInput.value.trim();
  if (!newRoom) return;
  socket.emit("room:switch", { newRoom });
  newRoomInput.value = "";
}

function switchRoomFromList(room) {
  if (room === currentRoom) return;
  socket.emit("room:switch", { newRoom: room });
}

// ── 9. LEAVE CHAT ──────────────────────────────────────────
leaveBtn.addEventListener("click", () => {
  socket.disconnect();
  myUsername = "";
  currentRoom = "General";
  lastAuthor  = null;
  messagesContainer.innerHTML = `
    <div class="welcome-message">
      <span>🎉</span>
      <p>Welcome! Messages will appear here.</p>
    </div>`;
  showScreen(joinScreen);
  usernameInput.value = "";
  roomInput.value     = "";
  usernameInput.focus();
  // Reconnect for next join
  socket.connect();
});

// ── 10. SIDEBAR TOGGLE (mobile) ────────────────────────────
sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});
document.addEventListener("click", (e) => {
  if (!sidebar.contains(e.target) && e.target !== sidebarToggle) {
    sidebar.classList.remove("open");
  }
});

// ── 11. RENDER MESSAGES ────────────────────────────────────

/** Render a single message object into the chat */
function renderMessage(msg) {
  // Remove welcome placeholder if present
  const welcome = messagesContainer.querySelector(".welcome-message");
  if (welcome) welcome.remove();

  if (msg.type === "system") {
    // System notification (join/leave)
    const el = document.createElement("div");
    el.className = "msg-system";
    el.textContent = msg.text;
    messagesContainer.appendChild(el);
    lastAuthor = null;
  } else {
    // User message
    const isMine       = msg.username === myUsername;
    const isConsec     = lastAuthor === msg.username;
    const wrapper      = document.createElement("div");

    wrapper.className = `msg-wrapper ${isMine ? "mine" : "other"}${isConsec ? " consecutive" : ""}`;
    wrapper.innerHTML = `
      <div class="msg-meta">
        <span class="msg-author">${escapeHtml(msg.username)}</span>
        <span class="msg-time">${msg.timestamp}</span>
      </div>
      <div class="msg-bubble">${escapeHtml(msg.text)}</div>
    `;

    messagesContainer.appendChild(wrapper);
    lastAuthor = msg.username;
  }

  scrollToBottom();
}

/** Render an array of messages (chat history) */
function renderHistory(messages) {
  messagesContainer.innerHTML = "";
  lastAuthor = null;

  if (!messages || messages.length === 0) {
    messagesContainer.innerHTML = `
      <div class="welcome-message">
        <span>🎉</span>
        <p>No messages yet. Start the conversation!</p>
      </div>`;
    return;
  }

  messages.forEach(renderMessage);
}

// ── 12. RENDER SIDEBAR ────────────────────────────────────

function renderUsers(users) {
  onlineCount.textContent = users.length;
  usersList.innerHTML = users
    .map((u) => `<li>${escapeHtml(u)}</li>`)
    .join("");
}

function renderRooms(rooms) {
  roomsList.innerHTML = rooms
    .map((r) => `
      <li class="${r === currentRoom ? "active" : ""}" onclick="switchRoomFromList('${escapeHtml(r)}')">
        # ${escapeHtml(r)}
      </li>
    `)
    .join("");
}

// ── 13. HELPERS ───────────────────────────────────────────

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/** Simple HTML escape to prevent XSS */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#39;");
}

// ── 14. SOCKET EVENT LISTENERS ────────────────────────────

// Confirmed join
socket.on("user:joined", ({ username, room }) => {
  myUsername    = username;
  currentRoom   = room;
  lastAuthor    = null;

  myUsernameDisplay.textContent  = username;
  currentRoomDisplay.textContent = room;

  showScreen(chatScreen);
  messageInput.focus();
});

// Chat history on room join
socket.on("chat:history", (messages) => {
  renderHistory(messages);
});

// New incoming message
socket.on("chat:message", (msg) => {
  renderMessage(msg);
});

// Room users list updated
socket.on("room:users", ({ users }) => {
  renderUsers(users);
});

// All rooms list updated
socket.on("rooms:list", (rooms) => {
  renderRooms(rooms);
});

// Typing indicator from others
const typingUsers = new Set();
socket.on("user:typing", ({ username, isTyping: typing }) => {
  if (typing) {
    typingUsers.add(username);
  } else {
    typingUsers.delete(username);
  }

  if (typingUsers.size === 0) {
    typingIndicator.textContent = "";
  } else if (typingUsers.size === 1) {
    typingIndicator.textContent = `${[...typingUsers][0]} is typing...`;
  } else {
    typingIndicator.textContent = `${[...typingUsers].join(", ")} are typing...`;
  }
});

// Error from server
socket.on("error:message", (msg) => {
  joinError.textContent = msg;
});

// Connection status
socket.on("connect", () => {
  connectionStatus.className = "status-dot connected";
  connectionStatus.title     = "Connected";
});

socket.on("disconnect", () => {
  connectionStatus.className = "status-dot disconnected";
  connectionStatus.title     = "Disconnected";
});
