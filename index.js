const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
require('dotenv').config()

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_CAREER_CODE_USER}:${process.env.DB_CAREER_CODE_PASS}@mydatabase.sr7puaa.mongodb.net/?retryWrites=true&w=majority&appName=MyDatabase`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const assignmentsCollection = client.db("StudyMate").collection("assignments")
    const submittedAssignmentsCollection = client.db("StudyMate").collection("submittedAssignments")


    app.get('/assignments', async (req, res) => {
      const allAssignments = await assignmentsCollection.find().toArray()
      res.send(allAssignments)
    })

    app.get('/assignments/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await assignmentsCollection.findOne(query)
      res.send(result)
    })
    
    app.delete('/assignments/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await assignmentsCollection.deleteOne(query)
      res.send(result)
    })

    app.patch('/assignments/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const assignmentInfo = req.body;

      console.log(assignmentInfo.dueDate)

      const updatedAssignment = {
        $set: {
          title: assignmentInfo.title,
          marks: assignmentInfo.marks,
          level: assignmentInfo.level,
          dueDate: assignmentInfo.dueDate,
          description: assignmentInfo.description
        }
      }
      console.log(updatedAssignment)
      const result = await assignmentsCollection.updateOne(query, updatedAssignment)
      res.send(result)
    })

    app.post('/assignments', async (req, res) => {
      const newAssignments = req.body;
      const result = await assignmentsCollection.insertOne(newAssignments);
      res.send(result)
    })


    // submitted Assignment details
    app.post('/submitted-assignments', async (req, res) => {
      const assignmentInfo = req.body
      const result = await submittedAssignmentsCollection.insertOne(assignmentInfo)
      res.send(result)
    })





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("backend integrated")
})

app.listen(port, () => {
    console.log(`app is listening on port ${port}`)
})