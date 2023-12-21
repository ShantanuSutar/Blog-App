import express from "express";
import postRoutes from "./routes/posts.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import commentRoutes from "./routes/comment.js";
import cookieParser from "cookie-parser";
import multer from "multer";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const port = process.env.PORT || 8800;

const app = express();

// Use cors middleware
app.use(cors());
app.use(express.json()); // to send json data to the server
app.use(cookieParser()); // to send json data to the server

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "../client/public/upload");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  },
});
//UPLOAD IMAGE
const upload = multer({ storage });

app.post(`/api/upload`, upload.single("file"), function (req, res) {
  const file = req.file;
  res.status(200).json(file.filename);
});

app.use(`/api/auth`, authRoutes);
app.use(`/api/users`, userRoutes);
app.use(`/api/posts`, postRoutes);
app.use(`/api/comments`, commentRoutes);

app.use("/", (req, res) => {
  res.send("Hello to homepage");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
