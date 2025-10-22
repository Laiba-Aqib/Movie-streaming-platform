const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'movieDB';

let db = null;
let client = null;

async function connectDB() {
  try {
    if (db) {
      return db;
    }

    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    
    console.log(`✅ Connected to MongoDB: ${dbName}`);
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB
};