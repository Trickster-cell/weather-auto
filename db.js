const { Pool } = require("pg");
require("dotenv").config();

console.log(process.env.DB_CONNECTION_STRING);

const isDevelopment = process.env.NODE_ENV === "development";

const pool = new Pool({
  connectionString: process.env.DB_CONNECTION_STRING,
  ssl: isDevelopment ? false : { rejectUnauthorized: false },
});

// Connect to the database with retries
async function connectToDatabase(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.connect();
      console.log("Connected to the database successfully.");
      await createTables();
      return; // Exit on successful connection
    } catch (error) {
      console.error(`Database connection failed (attempt ${i + 1}/${retries}):`, error);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((res) => setTimeout(res, delay)); // Wait before retrying
      }
    }
  }
  console.error("All attempts to connect to the database failed. Exiting...");
  process.exit(1);
}

// Create tables if they do not exist
async function createTables() {
  const createAlertThresholdsTableQuery = `
    CREATE TABLE IF NOT EXISTS public.alert_thresholds (
      id SERIAL PRIMARY KEY,
      max_temp DOUBLE PRECISION,
      min_temp DOUBLE PRECISION,
      max_humidity INTEGER,
      min_humidity INTEGER,
      max_wind_speed DOUBLE PRECISION,
      min_wind_speed DOUBLE PRECISION,
      user_email VARCHAR(50),
      city VARCHAR(50)
    );
  `;

  const createDailySummariesTableQuery = `
    CREATE TABLE IF NOT EXISTS public.daily_summaries (
      id SERIAL PRIMARY KEY,
      city VARCHAR(50),
      avg_temp DOUBLE PRECISION,
      max_temp DOUBLE PRECISION,
      min_temp DOUBLE PRECISION,
      dominant_condition VARCHAR(50),
      date DATE,
      avg_humidity DOUBLE PRECISION,
      max_humidity INTEGER,
      min_humidity INTEGER,
      avg_wind_speed DOUBLE PRECISION,
      max_wind_speed DOUBLE PRECISION,
      min_wind_speed DOUBLE PRECISION
    );
  `;

  const createWeatherDataTableQuery = `
    CREATE TABLE IF NOT EXISTS public.weather_data (
      id SERIAL PRIMARY KEY,
      city VARCHAR(50),
      temperature DOUBLE PRECISION,
      feels_like DOUBLE PRECISION,
      condition VARCHAR(50),
      "timestamp" BIGINT,
      humidity INTEGER,
      wind_speed DOUBLE PRECISION
    );
  `;

  const createUserSubscriptionsTableQuery = `
    CREATE TABLE IF NOT EXISTS public.user_subscriptions (
      id SERIAL PRIMARY KEY,
      email VARCHAR(100) NOT NULL,
      city VARCHAR(50) NOT NULL
    );
  `;

  try {
    await pool.query(createAlertThresholdsTableQuery);
    console.log("Table 'alert_thresholds' is ready.");
    await pool.query(createDailySummariesTableQuery);
    console.log("Table 'daily_summaries' is ready.");
    await pool.query(createWeatherDataTableQuery);
    console.log("Table 'weather_data' is ready.");
    await pool.query(createUserSubscriptionsTableQuery);
    console.log("Table 'user_subscriptions' is ready.");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
}

module.exports = {
  pool,
  connectToDatabase,
};
