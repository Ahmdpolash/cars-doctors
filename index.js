const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

//!middleware

app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "https://cars-doctor-32385.web.app",
      "https://cars-doctor-32385.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// const verify = async(req,res,next) =>{
//   const token = req.cookies?.token
//   if(!token){
//     return res.status(401).send({message : 'unauthorized access'})
//   }
//   jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
//     if(err){
//     return res.status(401).send({message : 'unauthorized access'})

//     }
//     req.user = decoded
//     next()
//   })
// }

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;

    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yrssrk8.mongodb.net/?retryWrites=true&w=majority`;

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

    const serviceCollection = client
      .db("carsDoctorsCollection")
      .collection("services");
    const bookingCollection = client
      .db("carsDoctorsCollection")
      .collection("bookings");

    //! auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "24h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", // Set to true in production
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // Adjust based on your requirements
          // maxAge: // how much time the cookie will exist
        })
        .send({ status: "true" });
    });

    
    //!logout clear the cookies automatically
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logged out user", user);

      res.clearCookie("token", { maxAge: 0,secure:false }).send({ success: true });
    });






    //? service related api
    //!single item
    app.get("/services", async (req, res) => {
      const result = await serviceCollection.find().toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    //!booking post

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    //! booking read --{email}
    app.get("/bookings", verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log("valid user info", req.user);

      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }

      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    //!booking delete
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    //!update
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const updateBooking = req.body;
      console.log(updateBooking);
      const filter = { _id: new ObjectId(id) };

      const updateInfo = {
        $set: {
          status: updateBooking.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateInfo);
      res.send(result);
    });

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
  res.send("cars doctor is coming soon");
});

app.listen(port, () => {
  console.log(`port is running on port : ${port}`);
});
