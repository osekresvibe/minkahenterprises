import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

let firebaseApp: App;

// Retain the original getSession function as it's part of the existing infrastructure.
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

// Retain getSharedMiddlewares as it's part of the original structure.
export function getSharedMiddlewares() {
  if (!sharedSessionMiddleware) {
    throw new Error("Auth not initialized - call setupAuth first");
  }
  return {
    session: sharedSessionMiddleware,
  };
}

// Integrate the new setupAuth logic for cleaner Firebase Admin initialization.
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  // Initialize Firebase Admin using the cleaner approach from the edited snippet.
  if (getApps().length === 0) {
    try {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

      if (!serviceAccountJson) {
        console.error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
        throw new Error('Firebase service account not configured');
      }

      const serviceAccountObj = JSON.parse(serviceAccountJson);

      firebaseApp = initializeApp({
        credential: cert(serviceAccountObj),
        // Keep projectId from original setup as it's not in the edited snippet's initializeApp call
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      });

      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
      throw error;
    }
  } else {
    firebaseApp = getApps()[0];
  }

  // Initialize session middleware as in the original setupAuth.
  sharedSessionMiddleware = getSession();
  app.use(sharedSessionMiddleware);

  // --- Original API Endpoints ---
  // These are kept as the edited snippet does not provide replacements, and removing them would be a new change.

  // Firebase Auth API Endpoint (original)
  app.post("/api/auth/firebase", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const idToken = authHeader.split("Bearer ")[1];
      // Using getAuth() without arguments assumes firebaseApp is initialized and available.
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

  // Logout API Endpoint (original)
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

  // Get User API Endpoint (original)
  app.get("/api/auth/user", async (req, res) => {
    const userId = (req.session as any)?.userId;

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

// Retain the original isAuthenticated middleware.
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

// Integrate the new authenticateToken middleware from the edited snippet.
export const authenticateToken: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Use getAuth() without arguments, assuming firebaseApp is correctly initialized by setupAuth.
    const decodedToken = await getAuth().verifyIdToken(idToken);

    // Fetch user from database using Firebase UID. `storage` is imported at the top.
    const user = await storage.getUserByFirebaseUid(decodedToken.uid);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    // Keeping 'Invalid token' as it's specific to the token verification failure.
    return res.status(401).json({ message: 'Invalid token' });
  }
};