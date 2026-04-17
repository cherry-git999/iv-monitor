const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Store latest data
let latestData = { weight: 0 };

// 🔵 Receive data from ESP8266
app.post("/data", (req, res) => {
    latestData = req.body;

    console.log("Weight:", latestData.weight);

    res.status(200).send("OK");
});

// 🟢 Send data to dashboard
app.get("/data", (req, res) => {
    res.json(latestData);
});

// 🌐 Serve dashboard
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"), (err) => {
        if (err) {
            console.error("Error sending index.html:", err);
            res.status(500).send("Error loading dashboard");
        }
    });
});

// 🔴 IMPORTANT: Railway PORT support
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});