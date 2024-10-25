const amqp = require("amqp-connection-manager");
const pool = require("../db");
require("dotenv").config();

const alertFunction = async (
  user_email,
  city,
  temperature,
  humidity,
  wind_speed
) => {
  const message = { city, temperature, humidity, wind_speed, user_email };
  const host = ["amqp://localhost:5672", "amqp://localhost:5673", "amqp://localhost:5674"];
  const connreq = [process.env.RABBIT_MQ_URL] || host;

  try {
    const connection = await amqp.connect(connreq); // Connect to RabbitMQ
    const channelWrapper = await connection.createChannel({
      json: true,
      setup: (channel) => channel.assertQueue("email_alerts", { durable: true }),
    });
    const queue = "email_alerts";

    channelWrapper
      .sendToQueue(queue, message)
      .then(() => console.log(`Alert message sent to queue for ${city}`))
      .catch((err) => console.log("Message was rejected...  Boo!", err));
  } catch (error) {
    console.error("Error sending alert message to RabbitMQ:", error);
  }
};

module.exports = { alertFunction };
