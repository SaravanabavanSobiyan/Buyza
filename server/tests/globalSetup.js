import { MongoMemoryReplSet } from "mongodb-memory-server";

export default async function globalSetup() {
  process.env.MONGOMS_VERSION = "7.0.14";
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGO_URL_TEST = replSet.getUri();
  globalThis.__REPLSET__ = replSet;
}
