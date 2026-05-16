import api from "./client";

export async function register(username: string, email: string, password: string) {
  const res = await api.post("/auth/register", { username, email, password });
  return res.data as { token: string; username: string };
}

export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });
  return res.data as { token: string; username: string };
}