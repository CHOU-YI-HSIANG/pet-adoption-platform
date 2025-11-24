require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('./models/Post');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-adoption').then(async () => {
  console.log('✅ 資料庫已連線');
  
  const result = await Post.updateMany(
    { status: 'draft' },
    { 
      $set: { 
        status: 'published',
        publishedAt: new Date()
      } 
    }
  );
  
  console.log('📝 已更新', result.modifiedCount, '筆貼文狀態為 published');
  
  const total = await Post.countDocuments();
  const published = await Post.countDocuments({ status: 'published' });
  const draft = await Post.countDocuments({ status: 'draft' });
  
  console.log('');
  console.log('📊 統計資料:');
  console.log('   總貼文數:', total);
  console.log('   published:', published);
  console.log('   draft:', draft);
  console.log('');
  
  await mongoose.connection.close();
  console.log('✅ 完成!所有貼文現在都應該顯示在社群動態中了');
  process.exit(0);
}).catch(err => {
  console.error(' 錯誤:', err.message);
  process.exit(1);
});
