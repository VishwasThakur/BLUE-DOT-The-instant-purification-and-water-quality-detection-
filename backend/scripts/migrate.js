require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/aivault';
const ATLAS_URI = process.env.MONGO_URI;

async function migrate() {
  if (!ATLAS_URI || ATLAS_URI.includes('127.0.0.1') || ATLAS_URI.includes('localhost')) {
    console.error('❌ Error: MONGO_URI in .env must be set to your MongoDB Atlas connection string before running migration.');
    console.error('   Example: MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/aivault');
    process.exit(1);
  }

  console.log('🔄 Starting Data Migration from Local MongoDB to MongoDB Atlas...');
  console.log(`📍 Source: ${LOCAL_URI}`);
  console.log(`☁️ Target: ${ATLAS_URI.replace(/:([^@]+)@/, ':****@')}`);

  const localClient = new MongoClient(LOCAL_URI);
  const atlasClient = new MongoClient(ATLAS_URI);

  try {
    await localClient.connect();
    console.log('✅ Connected to Local MongoDB.');
    await atlasClient.connect();
    console.log('✅ Connected to MongoDB Atlas.');

    const localDb = localClient.db('aivault');
    const atlasDb = atlasClient.db('aivault');

    const collections = await localDb.listCollections().toArray();

    if (collections.length === 0) {
      console.log('⚠️ No collections found in local database "aivault".');
      return;
    }

    for (const colInfo of collections) {
      const colName = colInfo.name;
      if (colName.startsWith('system.')) continue;

      const localCol = localDb.collection(colName);
      const atlasCol = atlasDb.collection(colName);

      const docs = await localCol.find({}).toArray();
      console.log(`\n📦 Migrating collection "${colName}" (${docs.length} documents)...`);

      if (docs.length > 0) {
        // Clear target collection in Atlas first to prevent duplicate _id conflicts on retry
        await atlasCol.deleteMany({});
        const result = await atlasCol.insertMany(docs);
        console.log(`✅ Successfully migrated ${result.insertedCount} documents into Atlas collection "${colName}".`);
      } else {
        console.log(`ℹ️ Collection "${colName}" is empty.`);
      }
    }

    console.log('\n🎉 --- Migration Completed Successfully ---');
    console.log('📊 Verification of MongoDB Atlas Collection Counts:');
    const atlasCollections = await atlasDb.listCollections().toArray();
    for (const colInfo of atlasCollections) {
      const colName = colInfo.name;
      const count = await atlasDb.collection(colName).countDocuments();
      console.log(`  • ${colName}: ${count} documents`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await localClient.close();
    await atlasClient.close();
    console.log('\n🔒 Database connections closed safely.');
  }
}

migrate();
