const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


const router = express.Router();

const mongoURL = "mongodb://localhost:27017";
const dbName = process.env.DB_NAME;

router.get("/test", async (req, res) => {
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db(dbName);
    res.send(`Test is working fine... ${client}`);
});

//  verify JWT
const verifyToken = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
        return res
            .status(401)
            .json({ error: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Error verifying JWT token:", error);
        res.status(401).json({ error: "Invalid token." });
    }
};

// Register a new user
router.post("/register", async (req, res) => {
    try {
        const { fullName, role, email, password } = req.body;

        // Connect to MongoDB
        const client = await MongoClient.connect(process.env.MONGO_URI);
        const db = client.db(dbName);

        // Check if user already exists
        const existingUser = await db.collection("users").findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = {
            fullName,
            role,
            email,
            password: hashedPassword,
        };

        // Insert the new user into the collection
        await db.collection("users").insertOne(newUser);

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Error during user registration:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        // client.close();
    }
});

// User login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Connect to MongoDB
        const client = await MongoClient.connect(process.env.MONGO_URI);
        const db = client.db(dbName);

        // Find the user by email
        const user = await db.collection("users").findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Check the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.SECRET_KEY,
            { expiresIn: "1d" }
        );

        // console.log(user.role);
        // Return the token
        res.json({ token, role: user.role, fullName: user.fullName });
        // console.log(token);
    } catch (error) {
        console.error("Error during user login:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        // client.close();
    }
});

// Instructor Dashboard
router.get("/courses/:email", verifyToken, async (req, res) => {
    try {
        const email = req.params.email;
        // console.log(email);
        // Connect to MongoDB
        const client = await MongoClient.connect(process.env.MONGO_URI);
        const db = client.db(dbName);

        // Fetch the list of Instructor by the user with the specified email
        const courses = await db
            .collection("courses")
            .find({ email: email })
            .toArray();

        res.json({ courses });
    } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        // client.close();
    }
});

// Add a new house
router.post("/courses", verifyToken, async (req, res) => {
    try {
        // Check if the user is a Instructor
        if (req.user.role !== "Instructor") {
            return res.status(403).json({
                error: "Access denied. Only Instructor can add course.",
            });
        }

        const {
            name,
            content,
            categories,
            picture,
            courseFee,
            phoneNumber,
            email,
            description,
        } = req.body;
        const instructor = req.user.userId; // Get the logged-in user's ID
        // Parse the values

        const parsedCourseFee = parseFloat(courseFee);

        // Validate the phone number (Bangladeshi phone numbers only)
        // Implement phone number validation logic here

        // Connect to MongoDB
        const client = await MongoClient.connect(process.env.MONGO_URI);
        const db = client.db(dbName);

        // Create a new house
        const newHouse = {
            name,
            content,
            categories,
            picture,
            rentPerMonth: parsedCourseFee,
            phoneNumber,
            email,
            description,
            instructor,
        };

        // Insert the new house into the collection
        await db.collection("houses").insertOne(newHouse);

        res.status(201).json({ message: "House added successfully" });
    } catch (error) {
        console.error("Error adding house:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        // client.close();
    }
});

// Delete a course
router.delete("/courses/:id", verifyToken, async (req, res) => {
    try {
        // Check if the user is a instructor
        if (req.user.role !== "Instructor") {
            return res.status(403).json({
                error: "Access denied. Only Instructor can delete courses.",
            });
        }

        const id = req.params.id;

        // Connect to MongoDB
        const client = await MongoClient.connect(process.env.MONGO_URI);
        const db = client.db(dbName);

        // Find and delete the course
        const result = await db
            .collection("courses")
            .deleteOne({ _id: new ObjectId(id) });

        // console.log(result);
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Course not found" });
        }

        res.json({ message: "Course deleted successfully" });
    } catch (error) {
        console.error("Error deleting Course:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        // client.close();
    }
});

// Update a course
router.put("/courses/:id", verifyToken, async (req, res) => {
    try {
        // Check if the user is a Instructor
        if (req.user.role !== "Instructor") {
            return res.status(403).json({
                error: "Access denied. Only Instructor can update houses.",
            });
        }

        const courseId = req.params.id;
        const {
            name,
            content,
            categories,
            picture,
            courseFee,
            phoneNumber,
            email,
            description,
        } = req.body;
        const instructor = req.user.userId; // Get the logged-in user's ID


        const parsedCourseFee = parseFloat(courseFee);

        // Implement  phone number validation logic here

        // Connect to MongoDB
        const client = await MongoClient.connect(process.env.MONGO_URI);
        const db = client.db(dbName);

        // Find and update the house
        const result = await db.collection("courses").updateOne(
            { _id: new ObjectId(courseId) },
            {
                $set: {
                    name,
                    content,
                    categories,
                    picture,
                    rentPerMonth: parsedCourseFee,
                    phoneNumber,
                    email,
                    description,
                    instructor,
                },
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Course not found" });
        }

        res.json({ message: "Course updated successfully" });
    } catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        // client.close();
    }
});

// Learner Dashboard get bookings
router.get("/learner/bookings/:email", verifyToken, async (req, res) => {
    try {
        const userEmail = req.params.email;
        // console.log(userEmail);
        // Connect to MongoDB
        const client = await MongoClient.connect(process.env.MONGO_URI);
        const db = client.db(dbName);

        // Fetch the bookings associated with the House Renter's email
        const bookings = await db
            .collection("bookings")
            .find({ email: userEmail })
            .toArray();

        res.json({ bookings });
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        // client.close();
    }
});

// Book a house
router.post("/bookings", verifyToken, async (req, res) => {
    try {
        // Check if the user is a Learner
        if (req.user.role !== "Learner") {
            return res.status(403).json({
                error: "Access denied. Only Learner can book houses.",
            });
        }

        const { name, email, phone, courseId } = req.body;
        const learner = req.user.userId; // Get the logged-in user's ID

        // Connect to MongoDB
        const client = await MongoClient.connect(process.env.MONGO_URI);
        const db = client.db(dbName);

        // Check if the House Renter has reached the maximum booking limit (2 houses)
        const existingBookings = await db
            .collection("bookings")
            .countDocuments({ learner });
        if (existingBookings >= 2) {
            return res.status(400).json({
                error: "Maximum booking limit reached. You cannot book more houses.",
            });
        }

        // Create a new booking
        const newBooking = {
            name,
            email,
            phone,
            courseId,
            learner,
        };

        // Insert the new booking into the collection
        await db.collection("bookings").insertOne(newBooking);

        res.status(201).json({ message: "Booking created successfully" });
    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        // client.close();
    }
});

// Remove a booking
router.delete("/bookings/:id", verifyToken, async (req, res) => {
    try {
        // Check if the user is a House Renter
        if (req.user.role !== "Learner") {
            return res.status(403).json({
                error: "Access denied. Only Learner can remove bookings.",
            });
        }

        const bookingId = req.params.id;

        // Connect to MongoDB
        const client = await MongoClient.connect(process.env.MONGO_URI);
        const db = client.db(dbName);

        // Find and delete the booking
        const result = await db
            .collection("bookings")
            .deleteOne({ _id: new ObjectId(bookingId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Booking not found" });
        }

        res.json({ message: "Booking removed successfully" });
    } catch (error) {
        console.error("Error removing booking:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        // client.close();
    }
});

// Home Page and course Search
// router.get("/courses", async (req, res) => {
//     try {
//         const {
//             city,
//             bedrooms,
//             bathrooms,
//             roomSize,
//             availability,
//             rentPerMonth,
//             rentMin,
//             rentMax,
//         } = req.query;

//         // console.log(req.query);

//         // Connect to MongoDB
//         const client = await MongoClient.connect(process.env.MONGO_URI);
//         const db = client.db(dbName);

//         // Build the query filter based on the provided search parameters
//         const filter = {};
//         if (city) {
//             filter.city = city;

//         }
//         if (bedrooms) {
//             filter.bedrooms = parseInt(bedrooms);
//         }
//         if (bathrooms) {
//             filter.bathrooms = parseInt(bathrooms);
//         }
//         if (roomSize) {
//             filter.roomSize = parseInt(roomSize);
//         }
//         if (availability) {
//             filter.availabilityDate = { $lte: new Date(availability) };
//         }
//         if (rentPerMonth) {
//             filter.rentPerMonth = parseFloat(rentPerMonth);
//         }
//         // if (rentMin && rentMax) {
//         //     filter.rentPerMonth = {
//         //         $gte: parseInt(rentMin),
//         //         $lte: parseInt(rentMax),
//         //     };
//         // } else if (rentMin) {
//         //     filter.rentPerMonth = { $gte: parseInt(rentMin) };
//         // } else if (rentMax) {
//         //     filter.rentPerMonth = { $lte: parseInt(rentMax) };
//         // }

//         // Fetch the houses based on the search filter
//         const courses = await db
//             .collection("courses")
//             .find(filter)
//             .limit(10)
//             .toArray();

//         res.json({ courses });
//     } catch (error) {
//         console.error("Error fetching courses:", error);
//         res.status(500).json({ error: "Internal server error" });
//     } finally {
//         // client.close();
//     }
// });
// get a single house details
router.get("/course/:id", verifyToken, async (req, res) => {
    // Connect to MongoDB
    const id = req.params.id;
    const client = await MongoClient.connect(process.env.MONGO_URI);

    try {
        const db = client.db(dbName);
        const result = await db
            .collection("courses")
            .findOne({ _id: new ObjectId(id) });
        res.json({ result });
    } catch (error) {
        console.error("Error fetching houses:", error);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        // client.close();
    }
});
module.exports = router;
