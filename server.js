const express = require('express');
const path = require('path');
const propertiesReader = require('properties-reader');
const {MongoClient, ServerApiVersion} = require('mongodb');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Load database configuration
let propertiesPath = path.resolve(__dirname, 'conf/db.properties');
let properties = propertiesReader(propertiesPath);

let dbPrefix = properties.get('db.prefix');
let dbUsername = encodeURIComponent(properties.get('db.users'));
let dbPwd = encodeURIComponent(properties.get('db.pwd'));
let dbName = properties.get('db.dbName');
let dbUrl = properties.get('db.dbUrl');
let dbParams = properties.get('db.params');

const uri = dbPrefix + dbUsername + ':' + dbPwd + dbUrl + dbParams;

// Connect to MongoDB
let db;
const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1});

async function connectToMongoDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log(`Connected to MongoDB database: ${dbName}`);
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
}

// Logger Middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Base route
app.get('/', (req, res) => {
    res.send('Welcome to the ActivityHive API!');
});

// app.param Middleware
app.param('collectionName', (req, res, next, collectionName) => {
    try {
        req.collection = db.collection(collectionName); // Sets collection to the corresponding collection name
        return next();
    } catch (err) {
        console.error('Invalid collection name:', err);
        res.status(400).send('Invalid collection name');
    }
});

// Dynamic GET Route
app.get('/api/:collectionName', async (req, res) => {
    try {
        const documents = await req.collection.find({}).toArray(); // Fetch all documents from collection
        res.status(200).json(documents);
    } catch (err) {
        console.error('Failed to fetch documents:', err); // Log error message if fetch fails
        res.status(500).send('Error fetching documents');
    }
});

// POST Route to add a new order
app.post('/api/orders', async (req, res) => {
    try {
        const order = req.body; // The order data in request body
        if (!order || !order.customerName || !order.customerPhone || !order.items || !Array.isArray(order.items)) {
            return res.status(400).send('Invalid order data'); // Validate the request body
        }

        const collection = db.collection('orders'); // Access the 'orders' collection
        const result = await collection.insertOne(order); // Insert the new order

        res.status(201).json({message: 'Order created successfully', orderId: result.insertedId});
    } catch (err) {
        console.error('Failed to create order:', err);
        res.status(500).send('Failed to create order');
    }
});

// PUT Route to Update Product Details by ID
app.put('/api/products/:id', async (req, res) => {
    try {
        const productId = parseInt(req.params.id, 10);
        const update = req.body;

        if (!update || typeof update.spaces !== 'number') {
            return res.status(400).send('Invalid update data');
        }

        const collection = db.collection('products'); // Access the 'products' collection
        const result = await collection.updateOne(
            {id: productId}, // Find the product by its ID
            {$set: update}   // Update specified fields
        );

        if (result.matchedCount === 0) {
            return res.status(404).send('Product not found');
        }

        res.status(200).json({message: 'Product updated successfully'});
    } catch (err) {
        console.error('Failed to update product:', err);
        res.status(500).send('Failed to update product');
    }
});

// Start the server after connecting to MongoDB
const PORT = 3000;
connectToMongoDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});
