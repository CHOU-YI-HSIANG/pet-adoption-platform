const mongoose = require("mongoose");

// 使用與 server.js 相同的連接字串
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/pet_adoption";

// 建立新的獨立連接（不干擾正在運行的 server）
const connection = mongoose.createConnection(uri);

connection.once("open", async () => {
  try {
    console.log(" 已連接到:", connection.name);
    
    const today = new Date("2025-11-26T00:00:00.000Z");
    const tomorrow = new Date("2025-11-27T00:00:00.000Z");
    
    // 直接操作集合
    const postsCollection = connection.db.collection("posts");
    const commentsCollection = connection.db.collection("comments");
    
    // 查詢今天的資料
    const todayPosts = await postsCollection.find({
      createdAt: { $gte: today, $lt: tomorrow }
    }).toArray();
    
    const todayComments = await commentsCollection.find({
      createdAt: { $gte: today, $lt: tomorrow }
    }).toArray();
    
    console.log("\n找到今天的資料:");
    console.log("  貼文:", todayPosts.length, "篇");
    console.log("  留言:", todayComments.length, "則");
    
    if (todayPosts.length > 0) {
      console.log("\n貼文列表 (前 10 篇):");
      todayPosts.slice(0, 10).forEach(p => {
        const time = new Date(p.createdAt).toLocaleString("zh-TW");
        console.log(`  - ${p.title} (${time})`);
      });
    }
    
    // 執行刪除
    const postsResult = await postsCollection.deleteMany({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    const commentsResult = await commentsCollection.deleteMany({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    console.log("\n 刪除結果:");
    console.log(`  貼文: ${postsResult.deletedCount} 篇`);
    console.log(`  留言: ${commentsResult.deletedCount} 則`);
    
    // 驗證
    const remainingPosts = await postsCollection.countDocuments();
    const remainingComments = await commentsCollection.countDocuments();
    
    console.log("\n剩餘資料:");
    console.log(`  貼文: ${remainingPosts} 篇`);
    console.log(`  留言: ${remainingComments} 則`);
    
    await connection.close();
    console.log("\n 完成，請刷新前端頁面查看結果");
    process.exit(0);
  } catch (err) {
    console.error("錯誤:", err);
    await connection.close();
    process.exit(1);
  }
});

connection.on("error", (err) => {
  console.error("連接失敗:", err);
  process.exit(1);
});
