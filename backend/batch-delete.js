const http = require("http");
const mongoose = require("mongoose");
const Post = require("./models/Post");
const Comment = require("./models/Comment");

async function fetchPosts() {
  return new Promise((resolve, reject) => {
    http.get("http://localhost:5000/api/posts?limit=50", (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(JSON.parse(data)));
      res.on("error", reject);
    });
  });
}

async function main() {
  try {
    console.log(" 正在從 API 取得貼文...");
    const apiData = await fetchPosts();
    console.log("API 回傳:", apiData.data.pagination.totalItems, "篇貼文\n");
    
    // 篩選今天的貼文
    const todayPosts = apiData.data.posts.filter(post => {
      return post.createdAt.startsWith("2025-11-26");
    });
    
    console.log("找到今天 (2025-11-26) 的貼文:", todayPosts.length, "篇");
    
    if (todayPosts.length === 0) {
      console.log(" 沒有今天的貼文");
      return;
    }
    
    console.log("\n準備刪除:");
    todayPosts.slice(0, 10).forEach(p => {
      console.log("  -", p.title);
    });
    if (todayPosts.length > 10) {
      console.log(`  ... 還有 ${todayPosts.length - 10} 篇`);
    }
    
    // 連接資料庫
    console.log("\n 連接資料庫...");
    await mongoose.connect("mongodb://localhost:27017/pet_adoption");
    console.log(" 已連接");
    
    // 取得要刪除的 ID
    const idsToDelete = todayPosts.map(p => mongoose.Types.ObjectId(p._id));
    
    // 刪除貼文
    const postsResult = await Post.deleteMany({ _id: { $in: idsToDelete } });
    console.log(`\n 已刪除 ${postsResult.deletedCount} 篇貼文`);
    
    // 也刪除今天的留言
    const today = new Date("2025-11-26T00:00:00.000Z");
    const tomorrow = new Date("2025-11-27T00:00:00.000Z");
    const commentsResult = await Comment.deleteMany({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    console.log(` 已刪除 ${commentsResult.deletedCount} 則留言`);
    
    await mongoose.connection.close();
    
    // 驗證
    console.log("\n 驗證結果...");
    const checkData = await fetchPosts();
    console.log("剩餘貼文:", checkData.data.pagination.totalItems, "篇");
    
    if (checkData.data.pagination.totalItems < apiData.data.pagination.totalItems) {
      console.log("\n 刪除成功！請刷新前端頁面");
    }
    
  } catch (error) {
    console.error(" 錯誤:", error.message);
  } finally {
    process.exit(0);
  }
}

main();
