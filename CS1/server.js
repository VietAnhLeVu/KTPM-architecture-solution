const express = require('express');
const lib = require('./utils');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const redis = require('redis');

// Load environment variables
// const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = redis.createClient({
    url: "redis://default:ZGhn1fgk2YlrEwjwkUETLfAJdzJOInXC@redis-19602.c252.ap-southeast-1-1.ec2.redns.redis-cloud.com:19602", // Now using full Redis URL
});

// Handle Redis connection events
redisClient.on('connect', () => {
    console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
    console.error('Redis error:', err);
});

// Connect the Redis client
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
    }
})();

const app = express();
const port = process.env.PORT || 3000; // Important for cloud platforms

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'URL Shortener API',
            version: '1.0.0',
            description: 'A simple Express URL shortener API',
        },
    },
    apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /short/{id}:
 *   get:
 *     summary: Get original URL by shortened ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shortened ID
 *     responses:
 *       200:
 *         description: Successfully retrieved original URL
 *       404:
 *         description: URL not found
 */
app.get('/short/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // 1. Check cache first
        let cachedUrl = await redisClient.get(id);
        if (cachedUrl) {
            console.log('Cache hit');
            console.log(cachedUrl);
            return res.redirect(cachedUrl);
        }

        console.log('Cache miss');
        // 2. If not in cache, fetch from database
        const url = await lib.findOrigin(id);
        if (!url) {
            return res.status(404).send("<h1>404 Not Found</h1>");
        }

        // 3. Set the fetched data in cache (with optional expiration)
        redisClient.setEx(id, 3600, url); // Cache for 1 hour

        // 4. Redirect to the fetched URL
        res.redirect(url);

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

/**
 * @swagger
 * /create:
 *   post:
 *     summary: Create a new shortened URL
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: Original URL to shorten
 *     responses:
 *       200:
 *         description: Successfully created short URL
 */
app.post('/create', async (req, res) => {
    try {
        const url = req.query.url;
        const newID = await lib.shortUrl(url);

        // Cache the newly created short URL immediately if you want (optional optimization)
        redisClient.setEx(newID, 3600, url); // Cache for 1 hour

        res.send(newID);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(port, () => {
    console.log(`CS1 app listening on port ${port}`);
    console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});
