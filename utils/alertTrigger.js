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
  // console.log(`Alert: ${city} - Temperature: ${temperature}, Condition: ${condition}`);

  // Fetch subscribers from the database
  // const { rows: subscribers } = await pool.query(
  //     'SELECT email FROM user_subscriptions WHERE city = $1',
  //     [city]
  // );

  // Prepare the message
  const message = {
    city,
    temperature,
    humidity,
    wind_speed,
    user_email,
  };

  // Publish the message to the RabbitMQ queue
  const host = [
    "amqp://localhost:5672",
    "amqp://localhost:5673",
    "amqp://localhost:5674",
  ];

  const connreq = [process.env.RABBIT_MQ_URL] || host;
  // console.log(connreq);

  try {
    const connection = await amqp.connect(connreq); // Connect to RabbitMQ
    const channelWrapper = await connection.createChannel({
      json: true,
      setup: function (channel) {
        return channel.assertQueue("email_alerts", { durable: true });
      },
    });
    const queue = "email_alerts";

    // await channel.assertQueue(queue, { durable: true }); // Ensure the queue exists
    // channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    //   persistent: true,
    // }); // Send the message
    // console.log((message));
    channelWrapper
      .sendToQueue(queue, (message))
      .then(function () {
        return console.log(`Alert message sent to queue for ${city}`);
      })
      .catch(function (err) {
        return console.log("Message was rejected...  Boo!", err);
      });

    // await channel.close(); // Close the channel
    // await connection.close(); // Close the connection
  } catch (error) {
    console.error("Error sending alert message to RabbitMQ:", error);
  }
};

module.exports = { alertFunction };
