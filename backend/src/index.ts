import express from "express";
import cors from "cors";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Wizard Tower backend works!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});