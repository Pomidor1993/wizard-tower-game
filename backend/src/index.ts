import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Wizard Tower backend works!",
    timestamp: new Date().toISOString(),
  });
});

// Placeholder - tutaj będą dodawane kolejne route'y
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`✦ Wizard Tower backend running on http://localhost:${PORT}`);
});
