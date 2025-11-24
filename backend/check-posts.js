const mongoose = require('mongoose');
const Post = require('./models/Post');
mongoose.connect('mongodb://localhost:27017/pet-adoption').then(async () => {
  const posts = await Post.find().sort({createdAt: -1}).limit(5);
  console.log('最新 5 筆貼文:');
  posts.forEach(p => {
    console.log('標題:', p.title);
    console.log('狀態:', p.status);
    console.log('類型:', p.type);
    console.log('---');
  });
  const total = await Post.countDocuments();
  const published = await Post.countDocuments({status: 'published'});
  const draft = await Post.countDocuments({status: 'draft'});
  console.log('總貼文數:', total);
  console.log('published:', published);
  console.log('draft:', draft);
  process.exit(0);
});
