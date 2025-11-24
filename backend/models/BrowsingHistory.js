const mongoose = require('mongoose');

const browsingHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number, // 瀏覽時長(秒)
    default: 0
  }
}, {
  timestamps: true
});

// 索引優化
browsingHistorySchema.index({ user: 1, viewedAt: -1 });
browsingHistorySchema.index({ pet: 1 });

module.exports = mongoose.model('BrowsingHistory', browsingHistorySchema);
