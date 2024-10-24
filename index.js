const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const { pool, connectToDatabase } = require("./db"); // Import pool and connectToDatabase
const weatherRoutes = require("./routes/weather");
const {
  alertCheck,
  fetchWeatherAndStore,
  calculateAndStoreDailySummary,
} = require("./controllers/weatherController");

const app = express();
app.use(cors());
app.use(express.json());

const port = 5000;

app.use("/api/weather", weatherRoutes);

// Connect to the database and start the server
connectToDatabase().then(() => {
  // Start the server only after a successful DB connection
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);

    // Set up intervals and cron jobs
    setInterval(fetchWeatherAndStore, 10 * 60 * 1000); // Fetch weather every 10 minutes
    setInterval(alertCheck, 3 * 60 * 60 * 1000); // Check alert every 3 hours
    alertCheck(); // Initial call to alert check

    cron.schedule("0 0 * * *", () => {
      console.log("Running daily summary calculation...");
      calculateAndStoreDailySummary(); // Check daily summary every midnight
    });
  });
}).catch((error) => {
  console.error("Failed to connect to the database:", error);
  process.exit(1); // Exit the process if the DB connection fails
});

// Root route
app.get("/", (req, res) => {
  res.send("Auto Weather");
});
