const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
// const { ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

var admin = require("firebase-admin");
var serviceAccount = require("./fir-advance-project-sdk.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyToken = async (req, res, next) => {
  const firebaseToken = req.headers?.authorization;
  if (!firebaseToken || !firebaseToken.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = firebaseToken.split(" ")[1];
  // console.log(token)
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    next();
  } catch (error) {
    res.status(401).send({ message: "Unauthorized access" });
  }
};

const uri = `mongodb+srv://${process.env.DB_CAREER_CODE_USER}:${process.env.DB_CAREER_CODE_PASS}@mydatabase.sr7puaa.mongodb.net/?retryWrites=true&w=majority&appName=MyDatabase`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const assignmentsCollection = client
      .db("StudyMate")
      .collection("assignments");
    const submittedAssignmentsCollection = client
      .db("StudyMate")
      .collection("submittedAssignments");

    const bookmarksCollection = client.db("StudyMate").collection("bookmarkedAssignments")
    const usersCollection = client.db("StudyMate").collection("users")

    app.get("/assignments", async (req, res) => {
      const query = { isDeleted: false };
      const allAssignments = await assignmentsCollection.find(query).toArray();
      res.send(allAssignments);
    });


app.get("/assignments", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 5);
    const difficulty = req.query.difficulty || "All";
    const skip = (page - 1) * limit;

    let query = {};
    if (difficulty !== "All") {
      query.level = difficulty;
    }

    const assignments = await assignmentsCollection
      .find(query)
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await assignmentsCollection.countDocuments(query);

    res.json({ assignments, total });
  } catch (err) {
    console.error("Error in /assignments:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/assignment-search", async (req, res) => {
  try {
    const { searchQuery, page = 1, limit = 5, difficulty = "All" } = req.query;
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.max(1, parseInt(limit) || 5);
    const skip = (parsedPage - 1) * parsedLimit;

    let query = {};
    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ];
    }
    if (difficulty !== "All") {
      query.level = difficulty;
    }

    const assignments = await assignmentsCollection
      .find(query)
      .skip(skip)
      .limit(parsedLimit)
      .toArray();

    const total = await assignmentsCollection.countDocuments(query);

    res.json({ assignments, total });
  } catch (err) {
    console.error("Error in /assignment-search:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/*     app.get("/assignment-search", async (req, res) => {
      const searchQuery = req.query.searchQuery;

      try {
        const query = {
          title: { $regex: searchQuery, $options: "i" },
          isDeleted: false,
        };

        const result = await assignmentsCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch assignments", error });
      }
    }); */

  app.post("/users", async (req, res) => {
  try {
    const user = req.body;
    console.log(user)
    if (!user?.email) {
      return res.status(400).send({ message: "Email is required" });
    }

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: user.email });
    if (existingUser) {
      return res.status(200).send({ message: "User already exists", user: existingUser });
    }

    // If not found, insert new user
    const result = await usersCollection.insertOne(user);
    res.status(201).send({ message: "User created successfully", insertedId: result.insertedId });

  } catch (err) {
    console.error("Error saving user:", err);
    res.status(500).send({ message: "Internal server error" });
  }
});
    
    app.get("/assignments/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await assignmentsCollection.findOne(query);
      res.send(result);
    });

    /*     app.delete('/assignments/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await assignmentsCollection.deleteOne(query)
      res.send(result)
    }) */

    app.patch("/assignments/:id/delete", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const deletedAssignment = { $set: { isDeleted: true } };
      const result = await assignmentsCollection.updateOne(
        query,
        deletedAssignment
      );
      res.send(result);
    });

    app.patch("/assignments/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const assignmentInfo = req.body;

      const updatedAssignment = {
        $set: {
          title: assignmentInfo.title,
          marks: assignmentInfo.marks,
          level: assignmentInfo.level,
          dueDate: assignmentInfo.dueDate,
          description: assignmentInfo.description,
          imageUrl: assignmentInfo.imageUrl
        },
      };
      const result = await assignmentsCollection.updateOne(
        query,
        updatedAssignment
      );
      res.send(result);
    });

    app.post("/assignments", async (req, res) => {
      const newAssignments = req.body;
      newAssignments.isDeleted = false;
      const result = await assignmentsCollection.insertOne(newAssignments);
      res.send(result);
    });

    // submitted Assignment details
    app.post("/submitted-assignments", async (req, res) => {
      const assignmentInfo = req.body;
      const result = await submittedAssignmentsCollection.insertOne(
        assignmentInfo
      );
      res.send(result);
    });

    app.get("/my-submitted-assignments", verifyToken, async (req, res) => {
      const email = req.query.email;

      if (req.decoded.email !== email) {
        return res.status(403).send({ message: "Access forbidden" });
      }

      const query = { email: email };
      const result = await submittedAssignmentsCollection.find(query).toArray();

      for (const assignment of result) {
        const assignmentQuery = { _id: new ObjectId(assignment.assignmentId) };
        const searchedAssignment = await assignmentsCollection.findOne(
          assignmentQuery
        );
        assignment.title = searchedAssignment?.title;
        assignment.marks = searchedAssignment?.marks;
        assignment.availability = searchedAssignment?.isDeleted;
      }
      res.send(result);
    });

    app.get("/pending-assignments", verifyToken, async (req, res) => {
      const query = { status: "pending" };
      const result = await submittedAssignmentsCollection.find(query).toArray();

      for (const assignment of result) {
        const assignmentQuery = { _id: new ObjectId(assignment.assignmentId) };
        const searchedAssignment = await assignmentsCollection.findOne(
          assignmentQuery
        );
        assignment.title = searchedAssignment?.title;
        assignment.marks = searchedAssignment?.marks;
        assignment.availability = searchedAssignment?.isDeleted;
      }
      res.send(result);
    });


    app.patch("/my-submitted-assignments/:id", async (req, res) => {
      const id = req.params.id;
      const evaluatedInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const updateSubmit = {
        $set: {
          status: evaluatedInfo.status,
          obtainedMarks: evaluatedInfo.marks,
          examinerFeedback: evaluatedInfo.feedback,
        },
      };
      const result = await submittedAssignmentsCollection.updateOne(
        query,
        updateSubmit
      );
      res.send(result);
    });


    app.post("/bookmarks", verifyToken, async (req, res) => {
  const { assignmentId } = req.body;
  console.log(assignmentId, req.decoded.email)
  const userEmail = req.decoded.email;

  const existing = await bookmarksCollection.findOne({ assignmentId, userEmail });
  if (existing) {
    return res.status(400).send({ message: "Already bookmarked" });
  }

  const result = await bookmarksCollection.insertOne({
    userEmail,
    assignmentId,
    bookmarkedAt: new Date()
  });

  res.send(result);
  
});


app.get("/my-bookmarks", verifyToken, async (req, res) => {
  const userEmail = req.decoded.email;

  const bookmarks = await bookmarksCollection.find({ userEmail }).toArray();

  // optionally, lookup full assignment details
  const assignmentIds = bookmarks.map(b => new ObjectId(b.assignmentId));
  const assignments = await assignmentsCollection.find({ _id: { $in: assignmentIds }, isDeleted: false }).toArray();

  res.send(assignments);
});

app.delete("/bookmarks/:assignmentId", verifyToken, async (req, res) => {
  const { assignmentId } = req.params;
  const userEmail = req.decoded.email;

  try {
    const result = await bookmarksCollection.deleteOne({
      assignmentId: assignmentId,
      userEmail: userEmail,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Bookmark not found" });
    }

    res.send({ message: "Bookmark removed successfully" });
  } catch (error) {
    console.error("Remove bookmark error:", error);
    res.status(500).send({ message: "Failed to remove bookmark" });
  }
});

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("backend integrated");
});

app.listen(port, () => {
  console.log(`app is listening on port ${port}`);
});

