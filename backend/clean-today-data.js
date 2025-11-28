const mongoose = require("mongoose");
const Post = require("./models/Post");
const Comment = require("./models/Comment");

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/pet_adoption";

mongoose.connect(uri).then(async () => {
  console.log(" 已連接到資料庫:", mongoose.connection.name);
  
  const today = new Date("2025-11-26T00:00:00.000Z");
  const tomorrow = new Date("2025-11-27T00:00:00.000Z");
  
  // 查詢今天的貼文
  const todayPosts = await Post.find({
    createdAt: { $gte: today, $lt: tomorrow }
  });
  
  console.log("\n找到今天的貼文:", todayPosts.length, "篇");
  if (todayPosts.length > 0) {
    console.log("\n貼文列表:");
    todayPosts.forEach(p => {
      const time = new Date(p.createdAt).toLocaleString("zh-TW");
      console.log(`  - ${p.title} (${time})`);
    });
  }
  
  // 查詢今天的留言
  const todayComments = await Comment.find({
    createdAt: { $gte: today, $lt: tomorrow }
  });
  
  console.log("\n找到今天的留言:", todayComments.length, "則");
  if (todayComments.length > 0) {
    console.log("\n留言列表 (前 10 則):");
    todayComments.slice(0, 10).forEach(c => {
      const time = new Date(c.createdAt).toLocaleString("zh-TW");
      const content = c.content.substring(0, 50);
      console.log(`  - ${content}... (${time})`);
    });
  }
  
  // 刪除
  const postsResult = await Post.deleteMany({
    createdAt: { $gte: today, $lt: tomorrow }
  });
  
  const commentsResult = await Comment.deleteMany({
    createdAt: { $gte: today, $lt: tomorrow }
  });
  
  console.log("\n 刪除結果:");
  console.log(`  貼文: ${postsResult.deletedCount} 篇`);
  console.log(`  留言: ${commentsResult.deletedCount} 則`);
  
  // 驗證剩餘
  const remainingPosts = await Post.countDocuments();
  const remainingComments = await Comment.countDocuments();
  
  console.log("\n剩餘資料:");
  console.log(`  貼文: ${remainingPosts} 篇`);
  console.log(`  留言: ${remainingComments} 則`);
  
  await mongoose.connection.close();
  console.log("\n 完成");
  process.exit(0);
}).catch(err => {
  console.error("錯誤:", err);
  process.exit(1);
});
