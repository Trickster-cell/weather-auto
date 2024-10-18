const express = require('express');
const { fetchManual, dailyManual, fetchWeatherAndCheckAlerts } = require('../controllers/weatherController');
const router = express.Router();

// Fetch weather data route
router.get('/fetch', fetchManual);

router.get('/fetch-daily', dailyManual)

router.get('/alert-check', fetchWeatherAndCheckAlerts)

module.exports = router;
