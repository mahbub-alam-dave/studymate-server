const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { dbConnect } = require("./db/dbConnect");

const usersRoutes = require("./routes/users.routes");
const assignmentsRoutes = require("./routes/assignments.routes");
const submissionsRoutes = require("./routes/submissions.routes");
const bookmarksRoutes = require("./routes/bookmarks.routes"); 
const tutorRoutes = require("./routes/tutors.routes"); 
const bookingRoutes = require("./routes/bookingRoutes"); 

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
