const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const router = express.Router();

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: Post content
 *               author:
 *                 type: string
 *                 example: userId
 *     responses:
 *       201:
 *         description: Post created successfully
 */
router.post('/', async (req, res) => {
    try {
        const post = new Post(req.body);
        await post.save();
        res.status(201).json(post);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/posts/{id}/like:
 *   post:
 *     summary: Like a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: userId
 *     responses:
 *       200:
 *         description: Post liked successfully
 *       404:
 *         description: Post not found
 */
router.post('/:id/like', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        const userId = req.body.userId;

        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.likes.includes(userId)) return res.status(400).json({ error: 'Already liked' });

        post.likes.push(userId);
        await post.save();

        res.json({ message: 'Liked successfully', post });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all posts
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: List of posts
 */
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find().populate('author', 'username').populate('likes', 'username');
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
