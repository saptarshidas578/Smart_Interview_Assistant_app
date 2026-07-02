import { InterviewSession } from "../types";
import { FirestoreStorageService } from "./firebase";

const LOCAL_STORAGE_KEY = "ai_interview_copilot_sessions";

export interface StorageService {
  saveSession(session: InterviewSession): Promise<void>;
  getSession(id: string): Promise<InterviewSession | null>;
  getAllSessions(): Promise<InterviewSession[]>;
  deleteSession(id: string): Promise<void>;
}

// Safe localStorage wrapper to prevent crashes in private modes or restricted environments like Microsoft Edge
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage access failed (getItem):", e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage access failed (setItem):", e);
    }
  }
};

class LocalStorageService implements StorageService {
  async saveSession(session: InterviewSession): Promise<void> {
    const sessions = await this.getAllSessions();
    const index = sessions.findIndex((s) => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  }

  async getSession(id: string): Promise<InterviewSession | null> {
    const sessions = await this.getAllSessions();
    return sessions.find((s) => s.id === id) || null;
  }

  async getAllSessions(): Promise<InterviewSession[]> {
    try {
      const data = safeLocalStorage.getItem(LOCAL_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as InterviewSession[];
    } catch (e) {
      console.error("Error parsing sessions from LocalStorage", e);
      return [];
    }
  }

  async deleteSession(id: string): Promise<void> {
    const sessions = await this.getAllSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  }
}

class HybridStorageService implements StorageService {
  private local = new LocalStorageService();
  private firestore = new FirestoreStorageService();

  async saveSession(session: InterviewSession): Promise<void> {
    // Save to local storage first (instant and guaranteed offline)
    await this.local.saveSession(session);
    // Sync to Cloud Firestore in the background
    try {
      await this.firestore.saveSession(session);
    } catch (e) {
      console.warn("Could not sync to Firestore cloud. Saved locally instead.", e);
    }
  }

  async getSession(id: string): Promise<InterviewSession | null> {
    // Try cloud first, fallback to local
    try {
      const sess = await this.firestore.getSession(id);
      if (sess) return sess;
    } catch (e) {
      console.warn("Could not read from cloud Firestore. Reading locally.", e);
    }
    return this.local.getSession(id);
  }

  async getAllSessions(): Promise<InterviewSession[]> {
    // Try listing cloud first, fallback to local if empty or errors
    try {
      const sessList = await this.firestore.getAllSessions();
      if (sessList && sessList.length > 0) {
        // Hydrate local cache
        safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessList));
        return sessList;
      }
    } catch (e) {
      console.warn("Could not list from cloud Firestore. Fetching local list.", e);
    }
    return this.local.getAllSessions();
  }

  async deleteSession(id: string): Promise<void> {
    await this.local.deleteSession(id);
    try {
      await this.firestore.deleteSession(id);
    } catch (e) {
      console.warn("Could not delete from cloud Firestore. Deleted locally.", e);
    }
  }
}

export const storageService: StorageService = new HybridStorageService();

