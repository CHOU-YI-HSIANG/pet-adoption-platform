const mongoose = require("mongoose");
const Post = require("./models/Post");

// 取得後端使用的完整連接字串
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/pet_adoption";

// 建立新連接
const newConn = mongoose.createConnection(uri);

newConn.once("open", async () => {
  try {
    console.log(" 已連接到:", newConn.name);
    
    const PostModel = newConn.model("Post", Post.schema);
    
    // 查詢所有貼文
    const all = await PostModel.find({}).sort({createdAt: -1});
    console.log("\n資料庫總貼文:", all.length, "篇\n");
    
    // 找出今天的貼文 (UTC 時區)
    const today = new Date("2025-11-26T00:00:00.000Z");
    const tomorrow = new Date("2025-11-27T00:00:00.000Z");
    
    const todayPosts = await PostModel.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    console.log("今天建立的貼文:", todayPosts.length, "篇");
    
    if (todayPosts.length > 0) {
      console.log("\n準備刪除:");
      todayPosts.forEach(p => {
        const time = new Date(p.createdAt).toLocaleString("zh-TW");
        console.log(`  - ${p.title} (${time})`);
      });
      
      const result = await PostModel.deleteMany({
        createdAt: { $gte: today, $lt: tomorrow }
      });
      
      console.log(`\n 成功刪除 ${result.deletedCount} 篇`);
      
      // 驗證
      const afterCount = await PostModel.countDocuments();
      console.log(`\n剩餘貼文: ${afterCount} 篇`);
      
      if (afterCount > 0) {
        console.log("\n剩餘貼文範例:");
        const remaining = await PostModel.find({}).sort({createdAt: -1}).limit(5);
        remaining.forEach(p => {
          const date = new Date(p.createdAt).toISOString().split("T")[0];
          console.log(`  ${date} - ${p.title}`);
        });
      }
    } else {
      console.log("\n沒有找到今天的貼文");
    }
    
    await newConn.close();
    console.log("\n 操作完成");
    process.exit(0);
  } catch (error) {
    console.error("錯誤:", error);
    await newConn.close();
    process.exit(1);
  }
});

newConn.on("error", (err) => {
  console.error("連接失敗:", err);
  process.exit(1);
});
