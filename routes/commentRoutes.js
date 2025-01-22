const express = require('express');
const { addComment } = require('../controllers/commentController');
const router = express.Router();

router.post('/', addComment);

module.exports = router;
