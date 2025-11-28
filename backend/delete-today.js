const mongoose = require("mongoose");
const Post = require("./models/Post");

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/pet_adoption";

mongoose.connect(uri).then(async () => {
  console.log("連接到資料庫:", mongoose.connection.name);
  
  const allPosts = await Post.find().sort({createdAt: -1}).limit(20);
  console.log("\n最新 20 篇貼文:");
  allPosts.forEach(p => {
    const date = new Date(p.createdAt).toISOString().split("T")[0];
    console.log("  " + date + " - " + p.title);
  });
  
  const todayStart = new Date("2025-11-26T00:00:00.000Z");
  const todayEnd = new Date("2025-11-27T00:00:00.000Z");
  
  const todayPosts = await Post.find({
    createdAt: { $gte: todayStart, $lt: todayEnd }
  });
  
  console.log("\n找到今天 (2025-11-26) 建立的貼文: " + todayPosts.length + " 篇");
  
  if (todayPosts.length > 0) {
    console.log("\n準備刪除:");
    todayPosts.forEach(p => console.log("  - " + p.title));
    
    const result = await Post.deleteMany({
      createdAt: { $gte: todayStart, $lt: todayEnd }
    });
    
    console.log("\n 成功刪除 " + result.deletedCount + " 篇");
  }
  
  const remaining = await Post.countDocuments();
  console.log("\n剩餘貼文總數: " + remaining + " 篇");
  
  process.exit(0);
}).catch(err => {
  console.error("錯誤:", err);
  process.exit(1);
});
