const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    author: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String },
    likes: { type: Number, default: 0 },
    comments: [
        {
            userName: String,
            body: String,
        },
    ],
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);
