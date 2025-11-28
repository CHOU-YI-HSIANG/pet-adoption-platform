const { MongoClient } = require("mongodb");

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log(" 已連接到 MongoDB");
    
    const db = client.db("pet_adoption");
    const postsCollection = db.collection("posts");
    const commentsCollection = db.collection("comments");
    
    // 查看所有資料庫
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log("\n所有資料庫:");
    for (const database of dbs.databases) {
      console.log(`  - ${database.name}`);
    }
    
    const today = new Date("2025-11-26T00:00:00.000Z");
    const tomorrow = new Date("2025-11-27T00:00:00.000Z");
    
    // 查詢
    const todayPosts = await postsCollection.find({
      createdAt: { $gte: today, $lt: tomorrow }
    }).toArray();
    
    console.log(`\n資料庫 pet_adoption 中今天的貼文: ${todayPosts.length} 篇`);
    
    if (todayPosts.length > 0) {
      console.log("\n執行強制刪除...");
      const result = await postsCollection.deleteMany({
        createdAt: { $gte: today, $lt: tomorrow }
      });
      console.log(` 已刪除 ${result.deletedCount} 篇貼文`);
    }
    
    const commentsResult = await commentsCollection.deleteMany({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    console.log(` 已刪除 ${commentsResult.deletedCount} 則留言`);
    
    // 最終確認
    const finalCount = await postsCollection.countDocuments();
    console.log(`\n最終貼文數: ${finalCount}`);
    
  } finally {
    await client.close();
    console.log("\n 完成");
  }
}

run().catch(console.error);
