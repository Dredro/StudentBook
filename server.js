// backend/server.js
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.json());

// ----- "Modele" danych w pamięci (przykład) -----
let users = [];  // { id, username, passwordHash, followers: [] }
let posts = [];  // { id, authorId, title, description, image, likes: [], comments: [], createdAt }
let currentPostId = 1;
let currentUserId = 1;

// Sekret do JWT (w produkcji trzymaj w zmiennych środowiskowych)
const JWT_SECRET = "MOJ_SUPER_TAJNY_SEKRET_123";

// Middleware weryfikujący token JWT
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
        req.user = decoded; // zapiszemy sobie dane o userze w req.user
        next();
    } catch (error) {
        return res.status(401).json({ error: "Niepoprawny token" });
    }
}

// =============== AUTH ===============

// Rejestracja
app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body;

    // Sprawdź czy user już istnieje
    const existingUser = users.find((u) => u.username === username);
    if (existingUser) {
        return res.status(400).json({ error: "Użytkownik o takiej nazwie już istnieje" });
    }

    // Hash hasła
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Utwórz nowego użytkownika
    const newUser = {
        id: currentUserId++,
        username,
        passwordHash,
        followers: []
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

    // Sprawdzamy hasło
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
        return res.status(401).json({ error: "Nieprawidłowe dane logowania" });
    }

    // Generujemy token JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ token, username: user.username, userId: user.id });
});

// =============== POSTY ===============

// Pobierz wszystkie posty
app.get("/api/posts", (req, res) => {
    // Można je zwrócić posortowane po dacie
    const sortedPosts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Konwertujemy id autora -> nazwa użytkownika
    const postsWithAuthorName = sortedPosts.map(post => {
        const author = users.find(u => u.id === post.authorId);
        return {
            ...post,
            author: author ? author.username : "Anonim"
        };
    });

    return res.json(postsWithAuthorName);
});

// Dodaj nowy post (wymaga autoryzacji)
app.post("/api/posts", authMiddleware, (req, res) => {
    const userId = req.user.userId;  // z tokena
    const { title, description, image } = req.body;

    if (!title || !description) {
        return res.status(400).json({ error: "Brak wymaganych pól: title, description" });
    }

    const newPost = {
        id: currentPostId++,
        authorId: userId,
        title,
        description,
        image: image || "",
        likes: [],    // tablica userId, którzy polubili
        comments: [], // { userId, body }
        createdAt: new Date().toISOString()
    };

    posts.unshift(newPost); // dodaj na początek
    return res.status(201).json({
        ...newPost,
        author: users.find(u => u.id === userId)?.username || "Anonim"
    });
});

// Like / Unlike posta
app.post("/api/posts/:postId/like", authMiddleware, (req, res) => {
    const userId = req.user.userId;
    const { postId } = req.params;

    const post = posts.find(p => p.id == postId);
    if (!post) {
        return res.status(404).json({ error: "Post nie znaleziony" });
    }

    // Sprawdź czy user już polubił
    const isLiked = post.likes.includes(userId);
    if (isLiked) {
        // Jeśli polubione -> unlike
        post.likes = post.likes.filter(id => id !== userId);
    } else {
        // Jeśli nie polubione -> like
        post.likes.push(userId);
    }

    // Zwracamy zaktualizowany post
    return res.json({
        ...post,
        author: users.find(u => u.id === post.authorId)?.username || "Anonim"
    });
});

// =============== KOMENTARZE ===============
app.post("/api/comments", authMiddleware, (req, res) => {
    const userId = req.user.userId;
    const { postId, body } = req.body;

    const post = posts.find(p => p.id == postId);
    if (!post) {
        return res.status(404).json({ error: "Post nie znaleziony" });
    }

    if (!body || !body.trim()) {
        return res.status(400).json({ error: "Pusty komentarz" });
    }

    // Dodaj komentarz
    const newComment = {
        userId,
        body
    };
    post.comments.push(newComment);

    return res.status(201).json({
        userName: users.find(u => u.id === userId)?.username || "Anonim",
        body: newComment.body
    });
});

// =============== FOLLOW ===============

// Follow/Unfollow innego użytkownika
app.post("/api/users/:userToFollowId/follow", authMiddleware, (req, res) => {
    const userId = req.user.userId;               // aktywny user
    const userToFollowId = parseInt(req.params.userToFollowId, 10);

    if (userId === userToFollowId) {
        return res.status(400).json({ error: "Nie możesz obserwować samego siebie!" });
    }

    const userToFollow = users.find(u => u.id === userToFollowId);
    if (!userToFollow) {
        return res.status(404).json({ error: "Użytkownik nie istnieje" });
    }

    // Sprawdź czy już followujemy
    const alreadyFollowing = userToFollow.followers.includes(userId);
    if (alreadyFollowing) {
        // Unfollow
        userToFollow.followers = userToFollow.followers.filter(id => id !== userId);
    } else {
        // Follow
        userToFollow.followers.push(userId);
    }

    return res.json({ success: true, message: "OK" });
});

// =============== START SERWERA ===============
const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
