const express = require('express');
const path = require('path');
const propertiesReader = require('properties-reader');
const {MongoClient, ServerApiVersion} = require('mongodb');

const app = express();
app.use(express.json());

// Load database configuration
let propertiesPath = path.resolve(__dirname, 'conf/db.properties');
let properties = propertiesReader(propertiesPath);

let dbPrefix = properties.get('db.prefix');
let dbUsername = encodeURIComponent(properties.get('db.user'));
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

// base route
app.get('/', (req, res) => {
    res.send('Welcome to the ActivityHive API!');
});

// app.param Middleware
app.param('collectionName', (req, res, next, collectionName) => {
    try {
        req.collection = db.collection(collectionName);
        return next();
    } catch (err) {
        console.error('Invalid collection name:', err);
        res.status(400).send('Invalid collection name');
    }
});

// GET Route
app.get('/api/:collectionName', async (req, res) => {
    try {
        const documents = await req.collection.find({}).toArray();
        res.status(200).json(documents);
    } catch (err) {
        console.error('Failed to fetch documents:', err);
        res.status(500).send('Error fetching documents');
    }
});

// Start the server after connecting to MongoDB
const PORT = 3000;
connectToMongoDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
});
