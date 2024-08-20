const express = require('express')
const app = express()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cloudinary = require('cloudinary');
const port = process.env.PORT || 5001;
require('dotenv').config()

//middleware here
app.use(express.json());
app.use(cors())


cloudinary.v2.config({
  cloud_name: 'ddlih3uaz',
  api_key: '827925472784483',
  api_secret: 'uyt5Uoi_NlK1dy-kCVme_YZOEf8',
  secure: true,
});



// replace username(${process.env.DB_USER}) and password(${process.env.DB_PASS}) here

const uri = "mongodb+srv://adhikaribiju11:Ogju6EElBqkZpFOS@cluster0.3guauqe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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

    const db = client.db("RamapoPatro");
    const jobsCollection = db.collection("events2");
    const userData = db.collection("userdata2"); // interest tags and class schedules

    // Creating index for event sorting last event posted will show first
    const indexKeys = { title: 1, category: 1 }; 
    const indexOptions = { name: "titleCategory" }; 
    const result = await jobsCollection.createIndex(indexKeys, indexOptions);
    
    // post a event
    app.post("/post-event", async (req, res) => {
        const body = req.body;
        //body.postedBy = "TEST";
        body.createdAt = new Date();
        body.regEmails = []; // to track registrations
        const result = await jobsCollection.insertOne(body);
        if (result?.insertedId) {
          return res.status(200).send(result);
        } else {
          return res.status(404).send({
            message: "can not insert try again leter",
            status: false,
          });
        }
      });
      // post the class schedule
      app.post("/class-schedule", async (req, res) => {
        try {
          const body = req.body;
          body.createdAt = new Date();
          delete body.starttime;
          delete body.endtime;
          console.log("Look");
          console.log(body);
          const result = await userData.insertOne(body);
          if (result?.insertedId) {
            return res.status(200).send({
              message: "User data saved successfully",
              status: true,
              result: result
            });
          } else {
            return res.status(404).send({
              message: "Failed to save user data. Please try again later",
              status: false,
            });
          }
        } catch (error) {
          console.error("Error saving user data:", error);
          return res.status(500).send({
            message: "Internal Server Error",
            status: false,
          });
        }
      });

      // Fetch user data by email
      app.get("/userdata/:email", async (req, res) => {
        const userEmail = req.params.email;
        console.log("Calendar");
        console.log(userEmail);
        try {
          const alluserData = await userData.find({}).toArray();
          alluserData.sort(alluserData.createdAt);
          console.log(alluserData);
          // Sort the array by createdAt in descending order // SORT GAREKO eutai email ko duita banera
          alluserData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          console.log(alluserData);
          const cuserData = alluserData.find(user => user.userEmail === userEmail);
          //console.log("HERE");
          console.log(cuserData);
          if (cuserData) {
            //cuserData.createdAt = new Date();
            res.send(cuserData);
          } else {
            res.status(404).send("User not found");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          res.status(500).send("Internal Server Error");
        }
      });

      
      // Update user data
    app.patch("/update-userdata/:email", async (req, res) => {
      const userEmail = req.body.userEmail;
      const alluserData = req.body;
      console.log("HEREEEEE");
      console.log(alluserData);
      alluserData.createdAt = new Date();

      const filter = { email: userEmail };
      const updateDoc = {
        $set: {
         // interestTags: alluserData.interestTags,
          //classSchedule: alluserData.classSchedule,
            ...alluserData
        },
      };
      
      try {
        const options = { upsert: true };
        const result = await userData.updateOne(filter, updateDoc, options);
        res.send(result);
      } catch (error) {
        console.error("Error updating user data:", error);
        res.status(500).send("Internal Server Error");
      }
    });




      // get all events 
    app.get("/all-events", async (req, res) => {
      const events = await jobsCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      res.send(events);
    });

    //delete this later
    app.get("/all-userData", async (req, res) => {
      const events = await userData
        .find({})
        .toArray();
      res.send(events);
    });

    // get single event using id
    app.get("/all-events/:id", async (req, res) => {
      // console.log(req.params.id);
      console.log(jobsCollection);
      const events = await jobsCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(events);
    });

    // get events based on email for my event listing 
    app.get("/myEvents/:email", async (req, res) => {
      // console.log("email---", req.params.email);
      const events = await jobsCollection
        .find({
          postedBy: req.params.email,
        })
        .toArray();
      res.send(events);
    });

        // get events registered on email for my event listing 
        app.get("/regEvents/:email", async (req, res) => {
          // console.log("email---", req.params.email);
          const events = await jobsCollection
            .find({
              postedBy: req.params.email,
            })
            .toArray();
          res.send(events);
        });

    //registration
    app.post("/register/:id", async (req, res) => {
      const { id } = req.params;
      const { email } = req.body;
    
      try {
        const result = await jobsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $addToSet: { regEmails: email } } // Ensure email is not duplicated
        );
        res.status(200).json({ success: true });
      } catch (error) {
        console.error("Registration failed:", error);
        res.status(500).json({ success: false, message: "Registration failed" });
      }
    });

  // Unregister endpoint
  app.post("/unregister/:id", async (req, res) => {
    const { id } = req.params;
    const { email } = req.body;

    try {
      const result = await jobsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $pull: { regEmails: email } } // Remove email from regEmails array
      );
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Unregistration failed:", error);
      res.status(500).json({ success: false, message: "Unregistration failed" });
    }
  });

    // delete a event
    app.delete("/event/:id", async(req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(filter);
      res.send(result);
    })

    // update an event
    app.patch("/update-event/:id", async (req, res) => {
      const id = req.params.id;
      const jobData = req.body;
      //console.log("TEST"+body);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
            ...jobData
        },
      };
      const options = { upsert: true };
      const result = await jobsCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})