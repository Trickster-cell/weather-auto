const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const { pool, connectToDatabase } = require("./db");
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
connectToDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);

      // Schedule weather fetching and alert checks
      setInterval(fetchWeatherAndStore, 10 * 60 * 1000); // Fetch weather every 10 minutes
      setInterval(alertCheck, 3 * 60 * 60 * 1000); // Check alerts every 3 hours
      alertCheck(); // Initial alert check on startup

      // Schedule daily summary calculation at midnight
      cron.schedule("0 0 * * *", () => {
        console.log("Running daily summary calculation...");
        calculateAndStoreDailySummary();
      });
    });
  })
  .catch((error) => {
    console.error("Failed to connect to the database:", error);
    process.exit(1); // Exit if database connection fails
  });

// Root route
app.get("/", (req, res) => {
  res.send("Auto Weather");
});
