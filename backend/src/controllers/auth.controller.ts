import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service.js";

export async function register(req: Request, res: Response) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ error: "Wszystkie pola są wymagane" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Hasło musi mieć minimum 6 znaków" });
    return;
  }

  try {
    const result = await registerUser(username, email, password);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email i hasło są wymagane" });
    return;
  }

  try {
    const result = await loginUser(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
}