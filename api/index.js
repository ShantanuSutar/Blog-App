import express from "express";
import postRoutes from "./routes/posts.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json()); // to send json data to the server
app.use(cookieParser()); // to send json data to the server

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);

app.use("/", (req, res) => {
  res.send("Hello to homepage");
});

app.listen(8800, () => {
  console.log("Server is running on port 8800");
});
