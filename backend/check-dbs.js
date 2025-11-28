const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/admin").then(async () => {
  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  
  console.log("所有資料庫:");
  for (const db of dbs.databases) {
    console.log("\n資料庫:", db.name);
    
    if (db.name !== "admin" && db.name !== "config" && db.name !== "local") {
      const conn = mongoose.connection.useDb(db.name);
      const collections = await conn.db.listCollections().toArray();
      
      const hasPost = collections.find(c => c.name === "posts");
      if (hasPost) {
        const postsCount = await conn.db.collection("posts").countDocuments();
        console.log("  posts 集合:", postsCount, "篇");
        
        if (postsCount > 0) {
          const samples = await conn.db.collection("posts").find().limit(3).toArray();
          samples.forEach(p => {
            const date = new Date(p.createdAt).toISOString().split("T")[0];
            console.log("    -", date, p.title);
          });
        }
      }
    }
  }
  
  process.exit(0);
}).catch(err => {
  console.error("錯誤:", err);
  process.exit(1);
});
