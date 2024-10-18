const express = require("express");

const cors = require("cors");

const cron = require("node-cron");

const app = express();
const weatherRoutes = require("./routes/weather");
const {
  alertCheck,
  fetchWeatherAndStore,
  calculateAndStoreDailySummary,
} = require("./controllers/weatherController");

app.use(cors());
app.use(express.json());

const port = 5000;

app.use("/api/weather", weatherRoutes);

setInterval(fetchWeatherAndStore, 10 * 60 * 1000);
// check weather details every 5 mins

setInterval(alertCheck, 3 * 60 * 60 * 1000);
// check alert every 3 hours

// Initial call
// fetchWeatherAndStore();
// alertCheck();

cron.schedule("0 0 * * *", () => {
  console.log("Running daily summary calculation...");
  calculateAndStoreDailySummary();
});
// check daily summary every midnight
app.get("/", (req, res) => {
  res.send("Auto Weather");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
