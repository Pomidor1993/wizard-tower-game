import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import characterRoutes from "./routes/character.routes.js"; 
import actionRoutes from "./routes/action.routes.js";
import equipmentRoutes from "./routes/equipment.routes.js";
import combatRoutes from "./routes/combat.routes.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/character", characterRoutes); 
app.use("/api/actions", actionRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/combat", combatRoutes);


// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Wizard Tower backend works!" });
});

app.listen(PORT, () => {
  console.log(`✦ Wizard Tower backend running on http://localhost:${PORT}`);
});