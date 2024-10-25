const express = require('express');
const { fetchManual, dailyManual, fetchWeatherAndCheckAlerts } = require('../controllers/weatherController');
const router = express.Router();

// Route to fetch weather data manually
router.get('/fetch', fetchManual);

// Route for daily manual weather data fetch
router.get('/fetch-daily', dailyManual);

// Route to check alerts based on weather data
router.get('/alert-check', fetchWeatherAndCheckAlerts);

module.exports = router;
