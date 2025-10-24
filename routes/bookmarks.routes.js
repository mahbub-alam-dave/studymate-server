const express = require("express");
const { ObjectId } = require("mongodb");
const { dbConnect } = require("../db/dbConnect");
// const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

const { client } = require("../db/dbConnect");
const db = client.db("StudyMate");
const bookmarks = db.collection("bookmarkedAssignments");
const assignmentsCollection = db.collection("assignments");

// Add bookmark
router.post("/", verifyToken, async (req, res) => {
  const { assignmentId } = req.body;
  const userEmail = req.decoded.email;

  // const bookmarks = await dbConnect("bookmarks");
  const existing = await bookmarks.findOne({ assignmentId, userEmail });

  if (existing) {
    return res.status(400).send({ message: "Already bookmarked" });
  }

  const result = await bookmarks.insertOne({
    userEmail,
    assignmentId,
    bookmarkedAt: new Date(),
  });

  res.send(result);
});

// Get my bookmarks
router.get("/my-bookmarks", verifyToken, async (req, res) => {
  const userEmail = req.query.email;
  // const bookmarks = await dbConnect("bookmarks");
  // const assignments = await dbConnect("assignments");

  const list = await bookmarks.find({ userEmail }).toArray();
  const assignmentIds = list.map((b) => new ObjectId(b.assignmentId));

  const result = await assignmentsCollection.find({ _id: { $in: assignmentIds } }).toArray();
  res.send(result);
});

// Remove bookmark
router.delete("/:assignmentId", verifyToken, async (req, res) => {
  const { assignmentId } = req.params;
  const userEmail = req.decoded.email;

  // const bookmarks = await dbConnect("bookmarks");
  const result = await bookmarks.deleteOne({ assignmentId, userEmail });

  if (result.deletedCount === 0)
    return res.status(404).send({ message: "Bookmark not found" });

  res.send({ message: "Bookmark removed" });
});

module.exports = router;
