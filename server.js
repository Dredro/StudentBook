// backend/server.js
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
// Zwiększamy limit, aby możliwe było przesyłanie większych plików w Base64
app.use(express.json({ limit: "10mb" }));

// ------- PRZYKŁADOWE DANE W PAMIĘCI ------- //
let users = []; // { id, username, passwordHash, followers: [] }
let posts = []; // { id, authorId, title, description, image, likes: [], comments: [], createdAt }
let currentPostId = 1;
let currentUserId = 1;

const JWT_SECRET = "MOJ_SUPER_TAJNY_SEKRET_123";

// Middleware weryfikujące token
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "Brak tokena w nagłówku Authorization" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Nieprawidłowy format tokena" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // tutaj zapiszemy userId w req.user.userId
        next();
    } catch (error) {
        return res.status(401).json({ error: "Niepoprawny token" });
    }
}

// ================== AUTH ================== //

// Rejestracja
app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body;

    const existingUser = users.find((u) => u.username === username);
    if (existingUser) {
        return res.status(400).json({ error: "Użytkownik o takiej nazwie już istnieje" });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = {
        id: currentUserId++,
        username,
        passwordHash,
        followers: [], // kto obserwuje TEGO użytkownika
    };
    users.push(newUser);

    return res.status(201).json({ message: "Utworzono użytkownika" });
});

// Logowanie
app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const user = users.find((u) => u.username === username);
    if (!user) {
        return res.status(401).json({ error: "Nieprawidłowe dane logowania" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
        return res.status(401).json({ error: "Nieprawidłowe dane logowania" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ token, username: user.username, userId: user.id });
});

// ================== POSTY ================== //

// Pobieranie postów
// -> dodatkowo dorzucamy `authorId` i `isFollowingAuthor` (czy zalogowany user obserwuje autora?)
app.get("/api/posts", (req, res) => {
    let currentUserId = null;
    try {
        // Spróbujmy odczytać token (jeśli jest)
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            currentUserId = decoded.userId;
        }
    } catch (error) {
        // Brak tokena lub niepoprawny token -> currentUserId = null
    }

    // Sortujemy posty wg daty malejąco
    const sortedPosts = [...posts].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Dla każdego posta znajdujemy autora i sprawdzamy, czy jest on obserwowany
    const postsWithExtras = sortedPosts.map((post) => {
        const author = users.find((u) => u.id === post.authorId);
        const authorName = author ? author.username : "Anonim";
        const authorId = author ? author.id : null;
        // "author" ma w polu followers ID-y tych, którzy obserwują TEGO autora
        // Aby sprawdzić, czy JA obserwuję go, sprawdzamy, czy w tablicy followers jest MÓJ userId:
        const isFollowingAuthor = author
            ? author.followers.includes(currentUserId) // autor ma w followers ID-y
            : false;

        return {
            ...post,
            author: authorName,
            authorId,
            isFollowingAuthor,
            likesCount: post.likes.length,
        };
    });

    return res.json(postsWithExtras);
});

// Dodawanie posta (image przechowujemy w Base64)
app.post("/api/posts", authMiddleware, (req, res) => {
    const userId = req.user.userId;
    const { title, description, image } = req.body;

    if (!title || !description) {
        return res.status(400).json({ error: "Brak wymaganych pól: title, description" });
    }

    const newPost = {
        id: currentPostId++,
        authorId: userId,
        title,
        description,
        // Zapisujemy base64 (np. "data:image/png;base64,....")
        image: image || "",
        likes: [],
        comments: [],
        createdAt: new Date().toISOString(),
    };

    posts.unshift(newPost);
    // zwracamy utworzony post wraz z "author" (nazwą), by nie musieć reloadować
    const author = users.find((u) => u.id === userId);
    return res.status(201).json({
        ...newPost,
        author: author ? author.username : "Anonim",
        authorId: userId,
        isFollowingAuthor: false, // świeży post -> można ustawić false lub sprawdzić
        likesCount: 0,
    });
});

// Like/unlike
app.post("/api/posts/:postId/like", authMiddleware, (req, res) => {
    const userId = req.user.userId;
    const { postId } = req.params;

    const post = posts.find((p) => p.id == postId);
    if (!post) {
        return res.status(404).json({ error: "Post nie znaleziony" });
    }

    const alreadyLiked = post.likes.includes(userId);
    if (alreadyLiked) {
        post.likes = post.likes.filter((id) => id !== userId);
    } else {
        post.likes.push(userId);
    }

    const author = users.find((u) => u.id === post.authorId);
    return res.json({
        ...post,
        author: author ? author.username : "Anonim",
        authorId: author ? author.id : null,
        isFollowingAuthor: author
            ? author.followers.includes(userId)
            : false,
        likesCount: post.likes.length,
    });
});

// ================== KOMENTARZE ================== //
app.post("/api/comments", authMiddleware, (req, res) => {
    const userId = req.user.userId;
    const { postId, body } = req.body;

    const post = posts.find((p) => p.id == postId);
    if (!post) {
        return res.status(404).json({ error: "Post nie znaleziony" });
    }

    if (!body?.trim()) {
        return res.status(400).json({ error: "Pusty komentarz" });
    }

    const newComment = {
        userId,
        body,
    };
    post.comments.push(newComment);

    // możemy zwrócić tzw. "widok" komentarza
    const user = users.find((u) => u.id === userId);
    return res.status(201).json({
        userName: user?.username || "Anonim",
        body: newComment.body,
    });
});

// ================== FOLLOW/UNFOLLOW ================== //
app.post("/api/users/:userToFollowId/follow", authMiddleware, (req, res) => {
    const userId = req.user.userId;
    const userToFollowId = parseInt(req.params.userToFollowId, 10);

    if (userId === userToFollowId) {
        return res.status(400).json({ error: "Nie możesz obserwować samego siebie!" });
    }

    const userToFollow = users.find((u) => u.id === userToFollowId);
    if (!userToFollow) {
        return res.status(404).json({ error: "Użytkownik nie istnieje" });
    }

    // userToFollow.followers -> tablica userId tych, którzy go obserwują
    const alreadyFollower = userToFollow.followers.includes(userId);
    if (alreadyFollower) {
        // unfollow
        userToFollow.followers = userToFollow.followers.filter((fId) => fId !== userId);
        return res.json({ success: true, message: "Unfollowed" });
    } else {
        // follow
        userToFollow.followers.push(userId);
        return res.json({ success: true, message: "Followed" });
    }
});

// ================== START SERWERA ================== //
const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
