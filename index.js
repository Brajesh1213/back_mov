require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000, // Ensures MongoDB connection attempt doesn't hang forever
        });
        console.log("✅ Connected to MongoDB");
        await initializeRooms(); // Ensure rooms are initialized after DB connection
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error);
        process.exit(1); // Stop the app if connection fails
    }
};

// Room Schema
const RoomSchema = new mongoose.Schema({
    roomNumber: Number,
    occupied: { type: Boolean, default: false }
});

const Room = mongoose.model("Room", RoomSchema);

// Ensure rooms exist in DB
const initializeRooms = async () => {
    try {
        const roomCount = await Room.countDocuments();
        if (roomCount === 0) {
            console.log("⏳ Initializing rooms...");
            const rooms = [];
            for (let floor = 1; floor <= 10; floor++) {
                let roomLimit = (floor === 10) ? 7 : 10; 
                for (let i = 1; i <= roomLimit; i++) {
                    rooms.push({ roomNumber: floor * 100 + i, occupied: false });
                }
            }
            await Room.insertMany(rooms);
            console.log("✅ Rooms Initialized in Database");
        }
    } catch (error) {
        console.error("❌ Error Initializing Rooms:", error);
    }
};

// Start database connection
connectDB();

// Test route
app.get("/", (req, res) => {
    res.send("Hello World!");
});

// Get all rooms
app.get("/rooms", async (req, res) => {
    try {
        const rooms = await Room.find();
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
});

// Book rooms
app.post("/book", async (req, res) => {
    try {
        const { count } = req.body;
        if (count < 1 || count > 5) return res.status(400).json({ error: "Invalid room count" });

        const availableRooms = await Room.find({ occupied: false }).limit(count);
        if (availableRooms.length < count) return res.status(400).json({ error: "Not enough rooms available" });

        for (const room of availableRooms) {
            room.occupied = true;
            await room.save();
        }

        res.json({ booked: availableRooms });
    } catch (error) {
        res.status(500).json({ error: "Failed to book rooms" });
    }
});

// Reset all rooms (Mark all as unoccupied)
app.post("/reset", async (req, res) => {
    try {
        await Room.updateMany({}, { occupied: false });
        res.json({ message: "All rooms have been reset" });
    } catch (error) {
        res.status(500).json({ error: "Failed to reset rooms" });
    }
});

// Randomly occupy rooms
app.post("/random", async (req, res) => {
    try {
        const rooms = await Room.find();
        const shuffledRooms = [...rooms].sort(() => Math.random() - 0.5); // Create a shuffled copy to avoid mutation issues
        const randomRooms = shuffledRooms.slice(0, Math.floor(Math.random() * rooms.length));

        for (let room of randomRooms) {
            room.occupied = Math.random() < 0.5; // 50% chance to be occupied
            await room.save();
        }

        res.json({ message: "Random occupancy updated", updated: randomRooms.length });
    } catch (error) {
        res.status(500).json({ error: "Failed to randomize rooms" });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
