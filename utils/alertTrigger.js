const amqp = require('amqplib');
const pool = require('../db');
require('dotenv').config();


const alertFunction = async (city, temperature, condition) => {
    console.log(`Alert: ${city} - Temperature: ${temperature}, Condition: ${condition}`);

    // Fetch subscribers from the database
    const { rows: subscribers } = await pool.query(
        'SELECT email FROM user_subscriptions WHERE city = $1',
        [city]
    );

    // Prepare the message
    const message = {
        city,
        temperature,
        condition,
        subscribers: subscribers.map(sub => sub.email), // Collect subscriber emails
    };

    // Publish the message to the RabbitMQ queue
    try {
        const connection = await amqp.connect(process.env.RABBIT_MQ_URL); // Connect to RabbitMQ
        const channel = await connection.createChannel();
        const queue = 'email_alerts';

        await channel.assertQueue(queue, { durable: true }); // Ensure the queue exists
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true }); // Send the message

        console.log(`Alert message sent to queue for ${city}`);
        await channel.close(); // Close the channel
        await connection.close(); // Close the connection
    } catch (error) {
        console.error('Error sending alert message to RabbitMQ:', error);
    }
};

module.exports = {alertFunction}