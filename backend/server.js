const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const Message = require("./models/Message");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

const onlineUsers = {}; // userId -> socket.id

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("No token"));
  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;
  onlineUsers[userId] = socket.id;
  console.log("User connected:", userId);

  // Send last 50 messages for this user
  Message.find({ $or: [{ sender: userId }, { receiver: userId }] })
    .sort({ createdAt: 1 })
    .limit(50)
    .then(msgs => socket.emit("previousMessages", msgs));

  socket.on("chatMessage", async ({ receiverId, text }) => {
    const message = await Message.create({ sender: userId, receiver: receiverId, text });
    
    // Send to sender
    socket.emit("chatMessage", message);

    // Send to receiver if online
    const receiverSocket = onlineUsers[receiverId];
    if (receiverSocket) io.to(receiverSocket).emit("chatMessage", message);
  });

  socket.on("disconnect", () => {
    delete onlineUsers[userId];
    console.log("User disconnected:", userId);
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => server.listen(5000, () => console.log("Server running on 5000")))
  .catch(err => console.log(err));
