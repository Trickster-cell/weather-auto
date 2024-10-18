const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.OPEN_WEATHER_API_KEY

const getWeatherData = async (city) => {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;
    const response = await axios.get(url);
    return response.data;
};

const convertTemperature = (kelvin) => {
    return kelvin - 273.15;
};

module.exports = { getWeatherData, convertTemperature };
