// Database Details
const DB_USER = process.env.DB_USER;
const DB_PWD = process.env.DB_PWD;
const DB_NAME = "demo";
const DB_URL = "cluster0.b6f7vug.mongodb.net"
const DB_COLLECTION_NAME = "demo-akif";

const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://Akif:akif1011@cluster0.b6f7vug.mongodb.net"

const client = new MongoClient(uri)

let db;

const connect = async () => {
    try {
      let result = await client.connect();
  
      db = result.db(DB_NAME);
      
      console.log("You successfully connected to MongoDB!");
      return db
    } finally {
    }
}

const coll = {
    connect
}

module.exports = coll