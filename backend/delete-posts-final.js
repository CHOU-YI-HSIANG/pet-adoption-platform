const mongoose = require("mongoose");
const Post = require("./models/Post");

// 使用與 server.js 完全相同的 URI
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/pet_adoption";

console.log("連接到:", uri);

// 建立新的連接（不干擾正在運行的 server.js）
const conn = mongoose.createConnection(uri);

conn.once("open", async () => {
  console.log(" 已連接到資料庫:", conn.name);
  
  const PostModel = conn.model("Post", Post.schema);
  
  // 查詢今天的貼文
  const today = new Date("2025-11-26T00:00:00.000Z");
  const tomorrow = new Date("2025-11-27T00:00:00.000Z");
  
  const todayPosts = await PostModel.find({
    createdAt: { $gte: today, $lt: tomorrow }
  });
  
  console.log("\n找到今天的貼文:", todayPosts.length, "篇");
  
  if (todayPosts.length > 0) {
    console.log("\n準備刪除:");
    todayPosts.forEach(p => console.log("  -", p.title));
    
    const result = await PostModel.deleteMany({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    console.log("\n 成功刪除", result.deletedCount, "篇");
  }
  
  const remaining = await PostModel.countDocuments();
  console.log("\n剩餘貼文:", remaining, "篇");
  
  await conn.close();
  process.exit(0);
});

conn.on("error", (err) => {
  console.error("連接錯誤:", err);
  process.exit(1);
});
