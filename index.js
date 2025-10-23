const express = require("express");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const { dbConnect } = require("./db/dbConnect");

const usersRoutes = require("./routes/users.routes");
const assignmentsRoutes = require("./routes/assignments.routes");
const submissionsRoutes = require("./routes/submissions.routes");
const bookmarksRoutes = require("./routes/bookmarks.routes"); 
const tutorRoutes = require("./routes/tutors.routes"); 
const bookingRoutes = require("./routes/bookingRoutes"); 
const { Server } = require("socket.io");

const app = express();
const port = process.env.PORT || 3000;

const server = http.createServer(app);

// ✅ Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*", // Allow your frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ Socket.IO Connection
io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  // Example: simple message event
  socket.on("send_message", (data) => {
    console.log("📩 Received message:", data);
    io.emit("receive_message", data); // broadcast to all clients
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// Middleware
// app.use(cors());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/users", usersRoutes);
app.use("/api/assignments", assignmentsRoutes);
app.use("/api/submissions", submissionsRoutes); 
app.use("/api/bookmarks", bookmarksRoutes); 
app.use("/api/tutors", tutorRoutes); 
app.use("/api", bookingRoutes); 

// Root endpoint
app.get("/", (req, res) => {
  res.send("🎓 EduCommunity API is running...");
});

// Start server
app.listen(port, async () => {
  await dbConnect(); // connect only once, handled internally
  console.log(`🚀 Server running on port ${port}`);
});
