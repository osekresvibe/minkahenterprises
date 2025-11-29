import { initializeApp, getApps, cert, type App, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

let firebaseApp: App;

function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        firebaseApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        });
      } catch (error) {
        console.error("Failed to parse Firebase service account:", error);
        throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT JSON");
      }
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT not set - using project ID only (token verification may fail)");
      firebaseApp = initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      });
    }
  } else {
    firebaseApp = getApps()[0];
  }
  return firebaseApp;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

let sharedSessionMiddleware: any = null;

export function getSharedMiddlewares() {
  if (!sharedSessionMiddleware) {
    throw new Error("Auth not initialized - call setupAuth first");
  }
  return {
    session: sharedSessionMiddleware,
  };
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  initializeFirebaseAdmin();
  
  sharedSessionMiddleware = getSession();
  app.use(sharedSessionMiddleware);

  app.post("/api/auth/firebase", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await getAuth().verifyIdToken(idToken);
      
      const { uid, email, name, picture } = decodedToken;
      
      const nameParts = (name || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const user = await storage.upsertUser({
        id: uid,
        email: email || "",
        firstName,
        lastName,
        profileImageUrl: picture || undefined,
      });

      (req.session as any).userId = uid;
      (req.session as any).user = user;
      
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        res.json(user);
      });
    } catch (error) {
      console.error("Firebase auth error:", error);
      res.status(401).json({ message: "Invalid token" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    const userId = (req.session as any)?.userId;
    const sessionUser = (req.session as any)?.user;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Auth check error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
