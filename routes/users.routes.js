const express = require("express");
const { dbConnect } = require("../db/dbConnect");

const router = express.Router();

const { client } = require("../db/dbConnect");
const db = client.db("StudyMate");
const usersCollection = db.collection("users");

// ✅ Register or update user
router.post("/", async (req, res) => {
  try {
    const user = req.body;

    if (!user?.email) {
      return res.status(400).send({ message: "Email is required" });
    }

    const existingUser = await usersCollection.findOne({ email: user.email });
    if (existingUser) {
      await usersCollection.updateOne(
        { email: existingUser.email },
        { $set: { lastSignedIn: new Date() } }
      );
      return res
        .status(200)
        .send({ message: "User already exists", user: existingUser });
    }

    const result = await usersCollection.insertOne(user);
    res
      .status(201)
      .send({ message: "User created successfully", id: result.insertedId });
  } catch (error) {
    res.status(500).send({ message: "Internal server error" });
  }
});

// ✅ Become a tutor (update role/profile)
router.patch("/:email", async (req, res) => {
  const { email } = req.params;
  const updatedData = req.body;

  try {
    const result = await usersCollection.updateOne({ email }, { $set: updatedData });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Update failed" });
  }
});

module.exports = router;
