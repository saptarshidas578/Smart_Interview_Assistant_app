import { useState, useEffect } from "react";
import { Sparkles, History, Moon, Sun, Award, Flame, Calendar } from "lucide-react";
import SetupScreen from "./components/SetupScreen";
import Dashboard from "./components/Dashboard";
import ReportCard from "./components/ReportCard";
import AuthAndGamification from "./components/AuthAndGamification";
import { InterviewConfig, InterviewTurn, InterviewSession, UserProfile } from "./types";
import { storageService } from "./services/storage";
import { auth, getUserProfile, saveUserProfile } from "./services/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

// Safe localStorage wrapper to prevent crashes in private modes or restricted environments like Microsoft Edge
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage access failed:", e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage access failed:", e);
    }
  }
};

export default function App() {
  const [step, setStep] = useState<"setup" | "interview" | "report">("setup");
  const [activeConfig, setActiveConfig] = useState<InterviewConfig | null>(null);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [pastSessions, setPastSessions] = useState<InterviewSession[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Track and synchronize local theme state
  useEffect(() => {
    const savedTheme = safeLocalStorage.getItem("theme_mode");
    const isDark = savedTheme === null ? true : savedTheme === "dark";
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Auth listener & session load triggers
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);
        if (user) {
          let profile: UserProfile | null = null;
          try {
            profile = await getUserProfile(user.uid);
          } catch (profileErr) {
            console.error("Failed to fetch user profile, falling back to local creation:", profileErr);
          }

          if (profile) {
            setUserProfile(profile);
          } else {
            // Setup default profile if not found
            const todayStr = new Date().toISOString().split("T")[0];
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || "",
              displayName: user.displayName || user.email?.split("@")[0] || "Student",
              totalScore: 0,
              sessionsCount: 0,
              streak: 1,
              lastActiveDate: todayStr,
              dailyGoals: [
                { id: "goal_1", text: "Complete 1 Mock Interview session", completed: false, category: "practice", targetValue: 1 },
                { id: "goal_2", text: "Score 80% or higher on an interview", completed: false, category: "score", targetValue: 80 },
                { id: "goal_3", text: "Review your detailed analytics report", completed: false, category: "generic" }
              ]
            };
            try {
              await saveUserProfile(newProfile);
            } catch (saveErr) {
              console.error("Failed to save default user profile:", saveErr);
            }
            setUserProfile(newProfile);
          }

          try {
            await loadSessions(user.uid);
          } catch (sessionLoadErr) {
            console.error("Failed to load user sessions:", sessionLoadErr);
          }
        } else {
          setUserProfile(null);
          setPastSessions([]);
        }
      } catch (authError) {
        console.error("Error inside onAuthStateChanged handler:", authError);
      } finally {
        // Ensure authLoading is ALWAYS set to false, preventing a perpetual verifying freeze
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      safeLocalStorage.setItem("theme_mode", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      safeLocalStorage.setItem("theme_mode", "light");
    }
  };

  const loadSessions = async (userId?: string) => {
    const sessions = await storageService.getAllSessions();
    if (userId) {
      setPastSessions(sessions.filter((s) => s.userId === userId));
    } else {
      setPastSessions(sessions.filter((s) => !s.userId));
    }
  };

  const handleStartInterview = async (config: InterviewConfig) => {
    setActiveConfig(config);
    setTurns([]);
    
    const newSession: InterviewSession = {
      id: `session_${Date.now()}`,
      userId: currentUser?.uid,
      config,
      turns: [],
      startTime: new Date().toISOString(),
      status: "ongoing"
    };

    setCurrentSession(newSession);
    await storageService.saveSession(newSession);
    setStep("interview");
    loadSessions(currentUser?.uid);
  };

  const handleCompleteInterview = async (finalTurns: InterviewTurn[]) => {
    if (!currentSession) return;

    // Calculate session overall score
    const scoreSum = finalTurns.reduce((acc, t) => acc + (t.evaluation?.score || 80), 0);
    const sessionScore = finalTurns.length > 0 ? Math.round(scoreSum / finalTurns.length) : 80;

    const completedSession: InterviewSession = {
      ...currentSession,
      userId: currentUser?.uid,
      turns: finalTurns,
      endTime: new Date().toISOString(),
      status: "completed"
    };

    setCurrentSession(completedSession);
    await storageService.saveSession(completedSession);
    setTurns(finalTurns);
    setStep("report");
    loadSessions(currentUser?.uid);

    // If a user profile is active, reward the score and check daily goals
    if (currentUser && userProfile) {
      const updatedGoals = userProfile.dailyGoals.map((goal) => {
        if (goal.id === "goal_1") {
          return { ...goal, completed: true };
        }
        if (goal.id === "goal_2" && sessionScore >= (goal.targetValue || 80)) {
          return { ...goal, completed: true };
        }
        if (goal.id === "goal_3") {
          return { ...goal, completed: true };
        }
        return goal;
      });

      const updatedProfile: UserProfile = {
        ...userProfile,
        totalScore: userProfile.totalScore + sessionScore,
        sessionsCount: userProfile.sessionsCount + 1,
        dailyGoals: updatedGoals
      };

      setUserProfile(updatedProfile);
      await saveUserProfile(updatedProfile);
    }
  };

  const handleReset = () => {
    setStep("setup");
    setActiveConfig(null);
    setCurrentSession(null);
    setTurns([]);
  };

  const handleLoadPastSession = (sess: InterviewSession) => {
    setCurrentSession(sess);
    setTurns(sess.turns);
    setActiveConfig(sess.config);
    setStep("report");
    setShowHistoryModal(false);
  };

  const handleDeletePastSession = async (id: string, e: any) => {
    e.stopPropagation();
    await storageService.deleteSession(id);
    loadSessions(currentUser?.uid);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 bg-gradient-to-tr from-[#B99362] to-[#D4B483] rounded-2xl flex items-center justify-center text-black font-extrabold text-xl shadow-[0_0_20px_rgba(185,147,98,0.25)] animate-pulse">
          I
        </div>
        <p className="font-mono text-xs text-slate-500 tracking-wider animate-pulse">
          VERIFYING INTERVIEW SYSTEM ACCESS...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
        <header className="border-b border-slate-200/60 dark:border-white/10 bg-white/70 dark:bg-dark-900/90 backdrop-blur sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-tr from-[#B99362] to-[#D4B483] rounded-lg flex items-center justify-center text-black font-extrabold text-base shadow-[0_0_15px_rgba(185,147,98,0.2)]">
                I
              </div>
              <span className="font-bold text-xs uppercase tracking-[0.25em] text-slate-800 dark:text-gold-500 font-sans">
                AI Interview Copilot
              </span>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 hover:text-gold-500 dark:hover:text-gold-400 bg-white/50 dark:bg-dark-900/50 transition"
              title="Toggle theme settings"
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Landing features promo panel */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/20 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase">
              ✨ HIGH-FIDELITY INTERVIEW SIMULATOR
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight font-sans">
              Master your next <br />
              <span className="bg-gradient-to-r from-amber-500 to-gold-500 bg-clip-text text-transparent">
                Tech or Business Interview
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
              Conduct high-fidelity mock interview sessions driven by adaptive AI, context-aware resume integrations, and dynamic scoring rules. Sign in now to record progress, unlock milestone badges, and climb the scoreboard!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 max-w-2xl">
              <div className="p-4 bg-white dark:bg-dark-900 border border-slate-200/50 dark:border-white/5 rounded-2xl flex items-start gap-3 shadow-sm">
                <div className="p-1.5 bg-gold-500/10 text-gold-500 rounded-lg shrink-0">
                  <Sparkles className="w-4 h-4 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Gemini Pro Simulation</h3>
                  <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-0.5 leading-normal">
                    Experience deep questions specifically tuned to your resume, job profile, and industry standards.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-dark-900 border border-slate-200/50 dark:border-white/5 rounded-2xl flex items-start gap-3 shadow-sm">
                <div className="p-1.5 bg-gold-500/10 text-gold-500 rounded-lg shrink-0">
                  <Award className="w-4 h-4 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Gamified Badge System</h3>
                  <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-0.5 leading-normal">
                    Collect cumulative points, hit preparation milestones, and unlock beautiful custom honors.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-dark-900 border border-slate-200/50 dark:border-white/5 rounded-2xl flex items-start gap-3 shadow-sm">
                <div className="p-1.5 bg-gold-500/10 text-gold-500 rounded-lg shrink-0">
                  <Flame className="w-4 h-4 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Consistency Goals & Streaks</h3>
                  <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-0.5 leading-normal">
                    Set goals and maintain practice streaks to build your professional muscle memory.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-dark-900 border border-slate-200/50 dark:border-white/5 rounded-2xl flex items-start gap-3 shadow-sm">
                <div className="p-1.5 bg-gold-500/10 text-gold-500 rounded-lg shrink-0">
                  <Calendar className="w-4 h-4 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Full History & Analytics</h3>
                  <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-0.5 leading-normal">
                    Get detailed report cards covering styling, vocabulary, structure, and suggestions for every session.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form container */}
          <div className="lg:col-span-5 w-full">
            <AuthAndGamification
              currentUser={currentUser}
              userProfile={userProfile}
              onProfileUpdate={setUserProfile}
              pastSessions={pastSessions}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 pb-16">
      
      {/* Visual Navigation Rail */}
      <header className="border-b border-slate-200/60 dark:border-white/10 bg-white/70 dark:bg-dark-900/90 backdrop-blur sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-[#B99362] to-[#D4B483] rounded-lg flex items-center justify-center text-black font-extrabold text-base shadow-[0_0_15px_rgba(185,147,98,0.2)]">
              I
            </div>
            <span className="font-bold text-xs uppercase tracking-[0.25em] text-slate-800 dark:text-gold-500 font-sans">
              AI Interview Copilot
            </span>
          </div>

          <div className="flex items-center gap-3">
            {step === "setup" && pastSessions.length > 0 && (
              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-white/10 hover:border-gold-500 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-dark-850 transition"
              >
                <History className="w-3.5 h-3.5" /> History ({pastSessions.length})
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 hover:text-gold-500 dark:hover:text-gold-400 bg-white/50 dark:bg-dark-900/50 transition"
              title="Toggle theme settings"
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Core Router Container */}
      <main className="transition duration-300">
        {step === "setup" && (
          <SetupScreen 
            onStart={handleStartInterview} 
            isLoading={false} 
            pastSessions={pastSessions}
            currentUser={currentUser}
            userProfile={userProfile}
            onProfileUpdate={setUserProfile}
          />
        )}

        {step === "interview" && activeConfig && (
          <Dashboard config={activeConfig} onComplete={handleCompleteInterview} />
        )}

        {step === "report" && currentSession && (
          <ReportCard 
            turns={turns} 
            session={currentSession} 
            onReset={handleReset} 
            userProfile={userProfile}
            pastSessions={pastSessions}
          />
        )}
      </main>

      {/* History modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-950 dark:text-white font-sans">
                <History className="w-4.5 h-4.5 text-gold-500" /> Practiced Sessions History
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-gold-400 font-semibold text-sm"
              >
                ✕ Close
              </button>
            </div>

            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
              {pastSessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleLoadPastSession(s)}
                  className="p-3.5 bg-slate-50 dark:bg-dark-850 hover:bg-gold-500/10 border border-slate-100 dark:border-white/10 hover:border-gold-500/40 rounded-2xl cursor-pointer flex items-center justify-between gap-4 transition"
                >
                  <div className="space-y-0.5 text-xs text-left">
                    <span className="font-mono text-[9px] text-gold-500 font-bold uppercase">
                      {s.config.company || "General"}
                    </span>
                    <h4 className="font-bold text-slate-850 dark:text-slate-200 line-clamp-1">{s.config.role}</h4>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono">
                      <Calendar className="w-3 h-3 text-gold-500/70" />
                      {new Date(s.startTime).toLocaleDateString()} at {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {s.turns.length > 0 && (
                      <span className="text-xs font-mono font-bold px-2 py-1 bg-indigo-100 dark:bg-gold-500/10 text-indigo-600 dark:text-gold-400 rounded-lg">
                        Score: {Math.round(s.turns.reduce((acc, t) => acc + (t.evaluation?.score || 80), 0) / s.turns.length)}%
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDeletePastSession(s.id, e)}
                      className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg transition"
                      title="Delete session log"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-2">
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">ALL TRANSCRIPTS SAVED SECURELY IN CLOUD PERSISTENCE</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
