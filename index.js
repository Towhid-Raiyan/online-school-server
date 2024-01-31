const express = require("express");
const cors = require("cors");
// const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const { default: mongoose } = require("mongoose");
const jwt = require("jsonwebtoken");
const app = express();

const authRoutes = require("./routes/auth");

const port = process.env.PORT || 3000;


const corsConfig = {
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Origin",
        "X-Requested-With",
        "Accept",
        "x-client-key",
        "x-client-token",
        "x-client-secret",
        "Authorization",
    ],
    credentials: true,
};


//middleware
app.use(cors(corsConfig));
app.options("*", cors(corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Routes
app.use("/api", authRoutes);

app.get("/", (req, res) => {
    res.send("Online School Server is Sitting...");
});
app.get("/test", (req, res) => {
    res.send("Test is working fine...");
});

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("database connection successful!"))
    .catch((err) => console.log(err));

// mongoose.set("useCreateIndex", true); // Set the useCreateIndex option

app.listen(port, () => {
    console.log(`app listening to the port: ${port}`);
});




