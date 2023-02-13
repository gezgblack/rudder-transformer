const { MongoClient } = require('mongodb');

// Connection URI
// const uri = 'mongodb+srv://root:root@cluster0.0v0bsdt.mongodb.net/?retryWrites=true&w=majority';

// const client = new MongoClient(uri);

class MongoClientCreator {
  constructor(dbName, collectionName) {
    this.store = new Map();
    this.db = dbName;
    this.collection = collectionName;
    this.indexCreated = false;
  }

  async getClient(uri) {
    if (this.store.size > 0) {
      return this.store.get(uri);
    }
    this.client = new MongoClient(uri);
    await this.client.connect();
    await this.client.db('admin').command({ ping: 1 });
    console.log('Successfully connected to MongoDB');
    this.store.set(uri, this.client);
    return this.store.get(uri);
  }

  async getCollection(uri) {
    const client = await this.getClient(uri);
    const database = await client.db('rudderstack');
    const cartTokenAnonIdMap = database.collection('cartToken_anonIdMap');
    if (!this.indexCreated) {
      cartTokenAnonIdMap.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 });
      cartTokenAnonIdMap.createIndex({ cartToken: 1 }, { expireAfterSeconds: 60 });
      this.indexCreated = true;
    }
    return cartTokenAnonIdMap;
  }
}

// async function run() {
//   try {
//     await client.connect();
//     await client.db('admin').command({ ping: 1 });

//     const database = client.db('sample_mflix');
//     const movies = database.collection('movies');

//     for (let i = 0; i < 10; i += 1) {
//       const temp = await movies.insertOne({ lastModifiedDate: Date.now(), serialNo: `${i}` });
//       console.log(temp);
//     }
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);

const mongoClientCreator = new MongoClientCreator();
module.exports = {
  mongoClientCreator,
};
