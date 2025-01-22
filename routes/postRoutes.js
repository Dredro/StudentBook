const express = require('express');
const { getPosts, createPost, likePost } = require('../controllers/postController');
const router = express.Router();

router.get('/', getPosts);
router.post('/', createPost);
router.post('/:postId/like', likePost);

module.exports = router;
