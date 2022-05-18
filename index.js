const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

require("dotenv").config();

const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(bodyParser.json());

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    console.log("decoded", decoded);
    req.decoded = decoded;
    next();
  });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3pagm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
const run = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db("reactTodo");
    const tasksCollection = db.collection("tasks");

    //Authentication API

    app.post("/login", async (req, res) => {
      const user = req.body;
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ accessToken });
    });

    // API to Run Server
    app.get("/", async (req, res) => {
      res.send("ToDo App Server Running");
    });

    //API to post User Info with Task who is posting the task

    app.post("/task", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.headers.email;
      if (email === decodedEmail) {
        const task = req.body;
        console.log(task);
        await tasksCollection.insertOne(task);
        res.send(task);
      } else {
        res.send("You are not authorized to add a task");
      }
    });

    //API to get tasks of a user by email
    app.get("/tasks/:email", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.headers.email;
      if (email === decodedEmail) {
        const email = req.params.email;
        const query = { taskWriterEmail: email };
        const tasks = await tasksCollection.find(query).toArray();
        res.send(tasks);
      } else {
        res.send("You are not authorized to get tasks of this user");
      }
    });

    //API to Delete a tasks by user
    app.delete("/task/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.headers.email;
      if (email === decodedEmail) {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const tasks = await tasksCollection.deleteOne(query);
        res.send(tasks);
      } else {
        res.send("You are not authorized to delete this task");
      }
    });

    //API to update a task by user
    app.put("/task/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.headers.email;
      if (email === decodedEmail) {
        const id = req.params.id;
        const task = req.body;

        const filter = { _id: ObjectId(id) };
        const option = { upsert: true };
        const updateDoc = { $set: task };

        const tasks = await tasksCollection.updateOne(
          filter,
          updateDoc,
          option
        );
        res.send(tasks);
      } else {
        res.send("You are not authorized to update this task");
      }
    });
  } finally {
    // client.close();
  }
};

run().catch(console.dir);

app.listen(port, () => console.log(`Listening on port ${port}`));
