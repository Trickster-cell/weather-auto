const pool = require("../db");
const { alertFunction } = require("../utils/alertTrigger");
const {
  getWeatherData,
  convertTemperature,
} = require("../utils/getWeatherData");
const { redis } = require("../utils/redis");

// Fetch weather data and store it in the database
const cities = [
  "Delhi",
  "Mumbai",
  "Chennai",
  "Bangalore",
  "Kolkata",
  "Hyderabad",
];
const fetchWeatherAndStore = async () => {
  try {
    for (const city of cities) {
      const data = await getWeatherData(city);
      const temperature = convertTemperature(data.main.temp);
      const feelsLike = convertTemperature(data.main.feels_like);
      const condition = data.weather[0].main;
      const timestamp = data.dt;
      const humidity = data.main.humidity; // New field
      const windSpeed = data.wind.speed; // New field

      // Insert data into weather_data table with new fields
      await pool.query(
        "INSERT INTO weather_data (city, temperature, feels_like, condition, timestamp, humidity, wind_speed) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          city,
          temperature,
          feelsLike,
          condition,
          timestamp,
          humidity,
          windSpeed,
        ]
      );
      const cacheKey = `weather:${city}`;
      const cacheValue = JSON.stringify({
        temperature,
        feelsLike,
        condition,
        timestamp,
        humidity,
        windSpeed,
      });

      // Set the cache value with an expiration time (e.g., 1 hour)
      await redis.set(cacheKey, cacheValue, "EX", 3600);
      console.log("Cache set successfully");
    }
    console.log("Weather data fetched and stored successfully");
  } catch (error) {
    console.error("Failed to fetch and store weather data:", error);
  }
};

const deleteWeatherDataForYesterday = async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1); // Go back one day
  const dateString = yesterday.toISOString().split("T")[0]; // Format as YYYY-MM-DD

  try {
    const result = await pool.query(
      "DELETE FROM weather_data WHERE DATE(TO_TIMESTAMP(timestamp)) <= $1",
      [dateString]
    );
    console.log(
      `Deleted ${result.rowCount} records for yesterday's weather data.`
    );
  } catch (error) {
    console.error("Error deleting weather data:", error);
  }
};

const calculateAndStoreDailySummary = async () => {
  try {
    for (const city of cities) {
      // SQL query to calculate the daily summary in one go
      const today = new Date().toISOString().split("T")[0];
      const { rows: summary } = await pool.query(
        `SELECT 
                      AVG(temperature) AS avg_temp, 
                      MAX(temperature) AS max_temp, 
                      MIN(temperature) AS min_temp, 
                      AVG(humidity) AS avg_humidity, 
                      MAX(humidity) AS max_humidity, 
                      MIN(humidity) AS min_humidity, 
                      AVG(wind_speed) AS avg_wind_speed, 
                      MAX(wind_speed) AS max_wind_speed, 
                      MIN(wind_speed) AS min_wind_speed, 
                      MODE() WITHIN GROUP (ORDER BY condition) AS dominant_condition
                   FROM weather_data
                   WHERE city = $1 
                   AND DATE(TO_TIMESTAMP(timestamp)) = $2`,
        [city, today]
      );

      if (summary.length > 0) {
        const {
          avg_temp,
          max_temp,
          min_temp,
          avg_humidity,
          max_humidity,
          min_humidity,
          avg_wind_speed,
          max_wind_speed,
          min_wind_speed,
          dominant_condition,
        } = summary[0];

        // Insert the calculated summary into the daily_summaries table
        await pool.query(
          `INSERT INTO daily_summaries 
            (city, avg_temp, max_temp, min_temp, avg_humidity, max_humidity, min_humidity, 
            avg_wind_speed, max_wind_speed, min_wind_speed, dominant_condition, date) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            city,
            avg_temp,
            max_temp,
            min_temp,
            avg_humidity,
            max_humidity,
            min_humidity,
            avg_wind_speed,
            max_wind_speed,
            min_wind_speed,
            dominant_condition,
            today,
          ]
        );

        console.log(`Daily summary for ${city} stored successfully.`);
      } else {
        console.log(`No weather data found for ${city} today.`);
      }
    }

    // Call deletion function after processing all cities
    await deleteWeatherDataForYesterday();
    console.log("Deleted yesterday's weather data.");
  } catch (error) {
    console.error("Failed to calculate and store daily summaries:", error);
  }
};

const fetchManual = async (req, res) => {
  try {
    await fetchWeatherAndStore();
    res
      .status(200)
      .json({ message: "Weather data fetched and stored successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch weather data"` ${error}` });
  }
};

const dailyManual = async (req, res) => {
  try {
    await calculateAndStoreDailySummary();
    res
      .status(200)
      .json({ message: "Daily summaries calculated and stored successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to calculate daily summaries" });
  }
};

const alertCheck = async () => {
  console.log("alert checking...");

  for (const city of cities) {
    const { rows: thresholds } = await pool.query(
      "SELECT * FROM alert_thresholds WHERE city = $1",
      [city]
    );

    // Fetch the latest weather data for the city from the weather API
    const data = await getWeatherData(city);
    const temperature = convertTemperature(data.main.temp);
    const humidity = data.main.humidity;
    const wind_speed = data.wind.speed;

    // Find the threshold for the current city
    for (const threshold of thresholds) {
      const {
        user_email,
        min_temp,
        max_temp,
        min_humidity,
        max_humidity,
        min_wind_speed,
        max_wind_speed,
      } = threshold;
      const isTemperatureOutOfRange =
        temperature > max_temp || temperature < min_temp;
      const isHumidityExceeded =
        humidity > max_humidity || humidity < min_humidity;
      const isWindSpeedExceeded =
        wind_speed > max_wind_speed || wind_speed < min_wind_speed;

      if (
        isTemperatureOutOfRange ||
        isHumidityExceeded ||
        isWindSpeedExceeded
      ) {
        console.log(`Alert for ${user_email}`);
        alertFunction(user_email, city, temperature, humidity, wind_speed);
      } else {
        console.log(`No Alert for ${user_email}`);
      }
    }
  }

  // Insert weather data into the database
};

const fetchWeatherAndCheckAlerts = async (req, res) => {
  try {
    // Fetch threshold data from the database
    await alertCheck();
    res.status(200).json({
      message: "Weather data fetched and alerts checked successfully",
    });
  } catch (error) {
    console.error("Error fetching weather data or checking alerts:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch weather data and check alerts" });
  }
};

module.exports = {
  fetchWeatherAndStore,
  calculateAndStoreDailySummary,
  fetchManual,
  dailyManual,
  fetchWeatherAndCheckAlerts,
  alertCheck,
};
