const express = require("express");
const { ObjectId } = require("mongodb");
const { dbConnect } = require("../db/dbConnect");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

const { client } = require("../db/dbConnect");
const db = client.db("StudyMate");
const submitted = db.collection("submittedAssignments");
const assignmentsCollection = db.collection("assignments");

// Submit assignment
router.post("/", async (req, res) => {
  const submission = req.body;
  const result = await submitted.insertOne(submission);
  res.send(result);
});

// Get my submissions
router.get("/my-submitted-assignments", verifyToken, async (req, res) => {
  const email = req.query.email;
  // const submitted = await dbConnect("submittedAssignments");
  // const assignments = await dbConnect("assignments");

  const result = await submitted.find({ email }).toArray();

  for (const s of result) {
    const details = await assignmentsCollection.findOne({ _id: new ObjectId(s.assignmentId) });
    s.title = details?.title;
    s.marks = details?.marks;
  }

  res.send(result);
});

// Pending submissions
router.get("/pending-assignments", verifyToken, async (req, res) => {
  // const submitted = await dbConnect("submittedAssignments");
  // const assignments = await dbConnect("assignments");

  const result = await submitted.find({ status: "pending" }).toArray();

  for (const s of result) {
    const details = await assignmentsCollection.findOne({ _id: new ObjectId(s.assignmentId) });
    s.title = details?.title;
    s.marks = details?.marks;
  }

  res.send(result);
});

// Evaluate submission
router.patch("/:id", async (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  // const submitted = await dbConnect("submittedAssignments");
  const result = await submitted.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: updates.status,
        obtainedMarks: updates.marks,
        examinerFeedback: updates.feedback,
      },
    }
  );
  res.send(result);
});

module.exports = router;
