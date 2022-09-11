if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");

const app = express();

const MONGODB_PORT = process.env.MONGODB_PORT || 27017;
const MONGODB_NAME = process.env.MONGODB_NAME || "blog";
const MONGO_DB_URL = `mongodb://localhost:${MONGODB_PORT}/${MONGODB_NAME}`;
mongoose.connect(MONGO_DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || "some secret",
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: MONGO_DB_URL,
    }),
    cookie: {
      maxAge: 1000 * 60, // in milliseconds, 1 day = 1000 * 60 * 60 * 24
    },
  })
);

app.use(express.static("public"));

app.use(expressLayouts);
app.set("layout", "./layouts/main");
app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const Post = require("./models/Post");
const Comment = require("./models/Comment");
const User = require("./models/User");

const isConnected = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

const isNotConnected = (req, res, next) => {
  if (req.session.user) {
    res.redirect("/");
  } else {
    next();
  }
};

// routes
app.get("/", isConnected, (req, res) => {
  res.render("index", { title: "Blog" });
});

app.get("/login", isNotConnected, (req, res) => {
  res.render("login", { title: "Login" });
});

app.post("/login", isNotConnected, async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (user == null) {
    return res.render("login", {
      title: "Login",
      error: "No user with that username.",
    });
  }

  try {
    if (await bcrypt.compare(password, user.password)) {
      req.session.user = user;
      res.render("index", { title: "Home" });
    } else {
      res.render("login", { title: "Login", error: "Wrong password." });
    }
  } catch {
    res.render("login", { title: "Login", error: "Server error." });
  }
});

app.get("/register", isNotConnected, (req, res) => {
  res.render("register", { title: "Register" });
});

app.post("/register", isNotConnected, async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();

    res.redirect("/login");
  } catch {
    res.render("register", { title: "Register", error: "Server error." });
  }
});

app.get("/posts", isConnected, async (req, res) => {
  const posts = await Post.find();
  res.render("posts", { title: "Posts", posts });
});

// TODO : add post only if authenticated
app.post("/posts", isConnected, async (req, res) => {
  const { title, text } = req.body;
  const post = new Post({
    title,
    text,
  });
  await post.save();
  res.redirect("/posts");
});

app.get("/posts/:id", isConnected, async (req, res) => {
  const post = await Post.findById(req.params.id).populate("comments");
  if (post == null) {
    //
  }
  res.render("post", { title: post.title, post });
});

// TODO : add comment only if authenticated
app.post("/posts/:id", isConnected, async (req, res) => {
  const comment = new Comment({
    text: req.body.comment,
    post: req.params.id,
  });

  await comment.save();

  const post = await Post.findById(req.params.id);
  post.comments.push(comment);
  await post.save();

  res.redirect(`/posts/${req.params.id}`);
});

app.get("/logout", isConnected, async (req, res) => {
  req.session.destroy((err) => {
    res.redirect("/login");
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Start session only where user logs in and not when makes any first HTTP request
// Is it possible ?
