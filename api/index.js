import express from "express";
import postRoutes from "./routes/posts.js";
const app = express();

app.use(express.json()); // to send json data to the server
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);

app.listen(8800, () => {
  console.log("Server is running on port 8800");
});
