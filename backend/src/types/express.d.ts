declare global {
  namespace Express {
    interface Request {
      user?: { id: number; [key: string]: any };
    }
  }
}

export {};