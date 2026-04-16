const mongoose = require('mongoose');

const dataSyncSchema = new mongoose.Schema({
  sourceId: {
    type: String,
    required: true,
    unique: true // Used for demonstrating duplicate entry error
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  receivedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DataSync', dataSyncSchema);
