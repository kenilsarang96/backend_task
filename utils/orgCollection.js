import mongoose from "mongoose";

// Generic, schemaless document for org-specific collections
const GenericOrgSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

export async function ensureCollectionExists(collectionName) {
  const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
  if (collections.length === 0) {
    await mongoose.connection.db.createCollection(collectionName);
  }
}

export async function copyCollectionData(oldCollection, newCollection) {
  if (oldCollection === newCollection) return;
  const db = mongoose.connection.db;
  const src = db.collection(oldCollection);
  const dest = db.collection(newCollection);

  // Copy in batches to avoid memory blow-ups
  const cursor = src.find({});
  const batchSize = 1000;
  let batch = [];
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    // Remove _id to let Mongo generate new ones or keep the same?
    // Keep the same to preserve references
    batch.push(doc);
    if (batch.length >= batchSize) {
      await dest.insertMany(batch, { ordered: false });
      batch = [];
    }
  }
  if (batch.length) {
    await dest.insertMany(batch, { ordered: false });
  }
}
