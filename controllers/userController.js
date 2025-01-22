const User = require('../models/User');

const followUser = async (req, res) => {
    const { username, targetUser } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isFollowing = user.followedUsers.includes(targetUser);
        if (isFollowing) {
            user.followedUsers = user.followedUsers.filter((user) => user !== targetUser);
        } else {
            user.followedUsers.push(targetUser);
        }
        await user.save();
        res.status(200).json({ followedUsers: user.followedUsers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { followUser };
