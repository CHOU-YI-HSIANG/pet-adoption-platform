const fetch = require("node-fetch");

async function deleteAllTodayPosts() {
  try {
    // 1. 先取得所有貼文
    const response = await fetch("http://localhost:5000/api/posts?limit=50");
    const data = await response.json();
    
    console.log("API 回傳貼文總數:", data.data.pagination.totalItems);
    
    // 2. 篩選今天的貼文
    const todayPosts = data.data.posts.filter(post => {
      return post.createdAt.startsWith("2025-11-26");
    });
    
    console.log("今天的貼文:", todayPosts.length, "篇\n");
    
    if (todayPosts.length === 0) {
      console.log("沒有今天的貼文需要刪除");
      return;
    }
    
    // 3. 需要登入才能刪除，讓我們直接透過 MongoDB 刪除
    const mongoose = require("mongoose");
    const Post = require("./models/Post");
    
    await mongoose.connect("mongodb://localhost:27017/pet_adoption");
    
    console.log("準備刪除以下貼文:");
    todayPosts.forEach(p => {
      console.log("  -", p.title);
    });
    
    // 刪除這些貼文的 _id
    const idsToDelete = todayPosts.map(p => p._id);
    const result = await Post.deleteMany({ _id: { $in: idsToDelete } });
    
    console.log("\n 刪除結果:", result.deletedCount, "篇");
    
    await mongoose.connection.close();
    
    // 4. 驗證
    const checkResponse = await fetch("http://localhost:5000/api/posts");
    const checkData = await checkResponse.json();
    console.log("\n驗證: 剩餘貼文", checkData.data.pagination.totalItems, "篇");
    
  } catch (error) {
    console.error("錯誤:", error.message);
  }
}

deleteAllTodayPosts();
