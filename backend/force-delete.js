const mongoose = require("mongoose");
const uri = "mongodb://localhost:27017/pet_adoption";

mongoose.connect(uri).then(async () => {
  console.log("連接成功");
  
  // 直接操作集合
  const db = mongoose.connection.db;
  const postsCollection = db.collection("posts");
  
  // 先查看所有貼文
  const allPosts = await postsCollection.find({}).toArray();
  console.log("資料庫中總貼文數:", allPosts.length);
  
  // 刪除今天的貼文
  const result = await postsCollection.deleteMany({
    createdAt: {
      $gte: new Date("2025-11-26T00:00:00.000Z"),
      $lt: new Date("2025-11-27T00:00:00.000Z")
    }
  });
  
  console.log("刪除結果:", result.deletedCount, "篇");
  
  // 驗證剩餘
  const remaining = await postsCollection.countDocuments();
  console.log("剩餘貼文:", remaining, "篇");
  
  if (remaining > 0) {
    const samples = await postsCollection.find({}).limit(5).toArray();
    console.log("\n剩餘貼文範例:");
    samples.forEach(p => {
      const date = new Date(p.createdAt).toISOString().split("T")[0];
      console.log("  " + date + " -", p.title);
    });
  }
  
  await mongoose.connection.close();
  console.log("\n 完成");
  process.exit(0);
}).catch(err => {
  console.error("錯誤:", err);
  process.exit(1);
});
