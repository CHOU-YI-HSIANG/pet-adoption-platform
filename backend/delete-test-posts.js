const mongoose = require('mongoose');
const Post = require('./models/Post');

mongoose.connect('mongodb://localhost:27017/pet_adoption').then(async () => {
  console.log('連接資料庫成功');
  
  const today = new Date('2025-11-26T00:00:00.000Z');
  const tomorrow = new Date('2025-11-27T00:00:00.000Z');
  
  const testPosts = await Post.find({ 
    createdAt: { $gte: today, $lt: tomorrow } 
  });
  
  console.log('找到今天建立的貼文:', testPosts.length, '篇\n');
  console.log('準備刪除的貼文:');
  testPosts.forEach(p => console.log('  -', p.title));
  
  const result = await Post.deleteMany({ 
    createdAt: { $gte: today, $lt: tomorrow } 
  });
  
  console.log('\n 成功刪除', result.deletedCount, '篇測試貼文');
  
  const remaining = await Post.countDocuments();
  console.log('剩餘貼文數:', remaining, '篇');
  
  process.exit(0);
}).catch(err => {
  console.error('錯誤:', err);
  process.exit(1);
});
