require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("MongoDB Connection Error:", err));

const RoomSchema = new mongoose.Schema({
    roomNumber: Number,
    occupied: { type: Boolean, default: false }
});

const Room = mongoose.model("Room", RoomSchema);

async function initializeRooms() {
    const roomCount = await Room.countDocuments();
    if (roomCount === 0) {
        const rooms = [];
        for (let floor = 1; floor <= 10; floor++) {
            let roomLimit = (floor === 10) ? 7 : 10; 
            for (let i = 1; i <= roomLimit; i++) {
                rooms.push({ roomNumber: floor * 100 + i, occupied: false });
            }
        }
        await Room.insertMany(rooms);
        console.log("Rooms Initialized in Database");
    }
}
initializeRooms();
app.get('/',(req,res)=>{
    res.send('Hello World!')
})

app.get("/rooms", async (req, res) => {
    const rooms = await Room.find();
    res.json(rooms);
});

app.post("/book", async (req, res) => {
    const { count } = req.body;
    if (count < 1 || count > 5) return res.status(400).json({ error: "Invalid room count" });

    const availableRooms = await Room.find({ occupied: false }).limit(count);
    if (availableRooms.length < count) return res.status(400).json({ error: "Not enough rooms available" });

    for (const room of availableRooms) {
        room.occupied = true;
        await room.save();
    }

    res.json({ booked: availableRooms });
});




app.post("/reset", async (req, res) => {
    await Room.updateMany({}, { occupied: false });
    res.json({ message: "All rooms have been reset" });
});
// API: Randomly Occupy Rooms
app.post("/random", async (req, res) => {
    try {
        const rooms = await Room.find();
        const randomRooms = rooms.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * rooms.length));
        
        for (let room of randomRooms) {
            room.occupied = Math.random() < 0.5; 
            await room.save();
        }

        res.json({ message: "Random occupancy updated", updated: randomRooms.length });
    } catch (error) {
        res.status(500).json({ error: "Failed to randomize rooms" });
    }
});


// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
