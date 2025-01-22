const Comment = require('../models/Comment');
const Post = require('../models/Post');

const addComment = async (req, res) => {
    const { postId, userName, body } = req.body;
    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = { userName, body };
        post.comments.push(comment);
        await post.save();

        res.status(201).json(comment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { addComment };
