const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const app = express();
const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/blog", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.static("public"));

app.use(expressLayouts);
app.set("layout", "./layouts/main");
app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const Post = require("./models/Post");
const Comment = require("./models/Comment");

app.get("/", (req, res) => {
  res.render("index", { title: "Blog" });
});

// routes
app.get("/login", (req, res) => {
  res.render("login", { title: "Login" });
});

app.post("/login", (req, res) => {
  // handle login form
});

app.get("/register", (req, res) => {
  res.render("register", { title: "Register" });
});

app.post("/register", (req, res) => {
  // handle register form
});

app.get("/posts", async (req, res) => {
  const posts = await Post.find();
  res.render("posts", { title: "Posts", posts });
});

// TODO : add post only if authenticated
app.post("/posts", async (req, res) => {
  const { title, text } = req.body;
  const post = new Post({
    title,
    text,
  });
  await post.save();
  res.redirect("/posts");
});

app.get("/posts/:id", async (req, res) => {
  const post = await Post.findById(req.params.id).populate("comments");
  if (post == null) {
    //
  }
  res.render("post", { title: post.title, post });
});

// TODO : add comment only if authenticated
app.post("/posts/:id", async (req, res) => {
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
//

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
