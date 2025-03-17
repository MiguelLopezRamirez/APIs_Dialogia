const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profile: {
    bio: { type: String }
  },
  
  
  regdate: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('cat_user', userSchema, 'cat_user');
