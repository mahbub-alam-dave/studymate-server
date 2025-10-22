const express = require("express");
const { ObjectId } = require("mongodb");
const { dbConnect } = require("../db/dbConnect");
const verifyToken = require("../middlewares/verifyToken");

const router = express.Router();

const { client } = require("../db/dbConnect");
const db = client.db("StudyMate");
const assignmentsCollection = db.collection("assignments");



// Create new assignment
router.post("/", async (req, res) => {
  const newAssignment = req.body;
  newAssignment.isDeleted = false;
  const result = await assignmentsCollection.insertOne(newAssignment);
  res.send(result);
});

// My created assignments
router.get("/my-created-assignments", async (req, res) => {
  const email = req.query.email;
  const result = await assignmentsCollection.find({ email }).toArray();
  if(!result) {
    return res.status(400).send({message: "You don't have any assignments"})
  }
  res.send(result);
});

// Update assignment
router.patch("/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
    // ✅ Step 1: Validate ID
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid assignment ID" });
  }
  const updates = req.body;
  const result = await assignmentsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updates }
  );
  res.send(result);
});

// Delete assignment
router.delete("/:id/delete", async (req, res) => {
  const id = req.params.id;
    // ✅ Step 1: Validate ID
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid assignment ID" });
  }
  const result = await assignmentsCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});


// Get assignments (with filters and pagination)
router.get("/", async (req, res) => {
  try {
    let { page = 1, limit = 5, category, searchQuery } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};

    if (category && category !== "All") filter.level = category;
    if (searchQuery) filter.title = { $regex: searchQuery, $options: "i" };

    const total = await assignmentsCollection.countDocuments(filter);
    const data = await assignmentsCollection
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    res.json({
      assignments: data,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalAssignments: total,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get single assignment
router.get("/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
    // ✅ Step 1: Validate ID
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid assignment ID" });
  }
  const result = await assignmentsCollection.findOne({ _id: new ObjectId(id) });
  if(!result){
    return res.send({status: 404})
  }
  res.send(result);
});



module.exports = router;
