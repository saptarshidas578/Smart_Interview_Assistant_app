import React, { useState, useEffect, FormEvent } from "react";
import { 
  auth, 
  getUserProfile, 
  saveUserProfile, 
  getLeaderboard 
} from "../services/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { UserProfile, DailyGoal, InterviewSession } from "../types";
import { 
  Trophy, 
  Flame, 
  Target, 
  CheckCircle2, 
  Circle, 
  User as UserIcon, 
  LogIn, 
  UserPlus, 
  LogOut, 
  Award, 
  Sparkles,
  TrendingUp,
  Mail,
  Lock,
  UserCheck,
  Compass,
  Zap,
  Coins,
  Crown
} from "lucide-react";
import { getAchievements } from "../services/achievements";

const ACHIEVEMENT_ICONS: Record<string, React.ComponentType<any>> = {
  Compass,
  TrendingUp,
  Award,
  Sparkles,
  Trophy,
  Flame,
  Zap,
  Coins,
  Crown,
  CheckCircle2
};

interface AuthAndGamificationProps {
  currentUser: User | null;
  userProfile: UserProfile | null;
  onProfileUpdate: (newProfile: UserProfile) => void;
  onRefreshLeaderboard?: () => void;
  pastSessions?: InterviewSession[];
}

export default function AuthAndGamification({
  currentUser,
  userProfile,
  onProfileUpdate,
  onRefreshLeaderboard,
  pastSessions = []
}: AuthAndGamificationProps) {
  // Auth Form States
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<"goals" | "leaderboard" | "achievements">("goals");
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Load Leaderboard
  const fetchLeaderboardData = async () => {
    setLoadingLeaderboard(true);
    try {
      const data = await getLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      console.error("Error loading leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [currentUser]);

  // Handle Auth Form Submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    if (isSignUp && !displayName) {
      setError("Please specify a display name.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Register user
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const name = displayName.trim();
        
        // Generate and save default profile
        const todayStr = new Date().toISOString().split("T")[0];
        const newProfile: UserProfile = {
          uid: credential.user.uid,
          email: credential.user.email || email,
          displayName: name,
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

        await saveUserProfile(newProfile);
        onProfileUpdate(newProfile);
      } else {
        // Log in user
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const profile = await getUserProfile(credential.user.uid);
        
        if (profile) {
          // Check streak update
          const todayStr = new Date().toISOString().split("T")[0];
          let updatedProfile = { ...profile };
          
          if (profile.lastActiveDate) {
            const lastActive = new Date(profile.lastActiveDate);
            const today = new Date(todayStr);
            const diffTime = Math.abs(today.getTime() - lastActive.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              // Consecutive day check in
              updatedProfile.streak += 1;
              updatedProfile.lastActiveDate = todayStr;
              await saveUserProfile(updatedProfile);
            } else if (diffDays > 1) {
              // Streak broken
              updatedProfile.streak = 1;
              updatedProfile.lastActiveDate = todayStr;
              // Reset daily goals on a new fresh active date
              updatedProfile.dailyGoals = updatedProfile.dailyGoals.map(g => ({ ...g, completed: false }));
              await saveUserProfile(updatedProfile);
            }
          } else {
            updatedProfile.lastActiveDate = todayStr;
            await saveUserProfile(updatedProfile);
          }
          onProfileUpdate(updatedProfile);
        }
      }
      
      // Clean form states
      setEmail("");
      setPassword("");
      setDisplayName("");
      fetchLeaderboardData();
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email address is already in use.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Email/Password registration is disabled in this Firebase project by default. To use Email/Password, you must enable it in your Firebase Console (Authentication > Sign-in method). Otherwise, please use 'Continue with Google' below!");
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const user = credential.user;
      
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        // Generate default profile for new Google user
        const todayStr = new Date().toISOString().split("T")[0];
        profile = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || user.email?.split("@")[0] || "User",
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
        await saveUserProfile(profile);
      } else {
        // Existing user: check streak update
        const todayStr = new Date().toISOString().split("T")[0];
        if (profile.lastActiveDate) {
          const lastActive = new Date(profile.lastActiveDate);
          const today = new Date(todayStr);
          const diffTime = Math.abs(today.getTime() - lastActive.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            profile.streak += 1;
            profile.lastActiveDate = todayStr;
            await saveUserProfile(profile);
          } else if (diffDays > 1) {
            profile.streak = 1;
            profile.lastActiveDate = todayStr;
            profile.dailyGoals = profile.dailyGoals.map(g => ({ ...g, completed: false }));
            await saveUserProfile(profile);
          }
        } else {
          profile.lastActiveDate = todayStr;
          await saveUserProfile(profile);
        }
      }
      onProfileUpdate(profile);
      fetchLeaderboardData();
    } catch (err: any) {
      console.error("Google auth error:", err);
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  // Toggle Daily Goal
  const toggleGoal = async (goalId: string) => {
    if (!userProfile) return;

    const updatedGoals = userProfile.dailyGoals.map(goal => {
      if (goal.id === goalId) {
        return { ...goal, completed: !goal.completed };
      }
      return goal;
    });

    const updatedProfile: UserProfile = {
      ...userProfile,
      dailyGoals: updatedGoals
    };

    onProfileUpdate(updatedProfile);
    await saveUserProfile(updatedProfile);
  };

  return (
    <div className="bg-white dark:bg-dark-900 border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 shadow-md h-full flex flex-col justify-between">
      {/* 1. Unauthenticated Card */}
      {!currentUser ? (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-gold-500/10 text-gold-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white font-sans">
              Gamified Prep Profile
            </h3>
            <p className="text-xs text-slate-500 leading-normal max-w-sm mx-auto">
              Create an account or sign in to save your mock interview scores, track daily goals, build streaks, and rank on the scoreboard!
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3 pt-2">
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">
                  DISPLAY NAME
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter your nickname/username"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-dark-950 border border-slate-250 dark:border-white/5 rounded-xl focus:outline-none focus:border-gold-500 transition font-sans"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-dark-950 border border-slate-250 dark:border-white/5 rounded-xl focus:outline-none focus:border-gold-500 transition font-sans"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">
                PASSWORD
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-dark-950 border border-slate-250 dark:border-white/5 rounded-xl focus:outline-none focus:border-gold-500 transition font-sans"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-[11px] text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-xl text-center leading-normal">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-[#B99362] to-[#D4B483] hover:from-[#a88251] hover:to-[#c3a372] active:scale-[0.98] text-black font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition duration-150 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-black" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-3.5 h-3.5" /> Sign Up & Initialize Profile
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" /> Sign In
                </>
              )}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-2 text-[10px] font-bold font-mono text-slate-400">
            <div className="border-t border-slate-150 dark:border-white/5 w-full"></div>
            <span className="bg-white dark:bg-dark-900 px-2 shrink-0">OR</span>
            <div className="border-t border-slate-150 dark:border-white/5 w-full"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-dark-950 dark:hover:bg-dark-800 text-slate-705 dark:text-slate-200 border border-slate-250 dark:border-white/5 font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition duration-150 disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="text-center pt-1">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-gold-500 dark:hover:text-gold-400 font-sans cursor-pointer"
            >
              {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up for free"}
            </button>
          </div>
        </div>
      ) : (
        // 2. Authenticated Profile & Leaderboard
        <div className="space-y-4 h-full flex flex-col justify-between">
          <div>
            {/* Header Profiler Stats */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-gold-500 text-black font-extrabold rounded-xl flex items-center justify-center text-sm font-mono shadow">
                  {userProfile?.displayName ? userProfile.displayName[0].toUpperCase() : "U"}
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                    {userProfile?.displayName || "Student Profile"}
                    <Award className="w-3.5 h-3.5 text-gold-500" />
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate max-w-[130px] font-mono">
                    {userProfile?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-mono font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span>STREAK: {userProfile?.streak || 1}d</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 border border-slate-200 dark:border-white/10 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg bg-slate-50 dark:bg-dark-950 cursor-pointer"
                  title="Sign out of your profile"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="p-2.5 bg-slate-50 dark:bg-dark-950 border border-slate-150 dark:border-white/5 rounded-xl text-center">
                <span className="text-[9px] font-bold font-mono text-slate-400 uppercase block">CUMULATIVE SCORE</span>
                <div className="text-lg font-mono font-bold text-gold-500 mt-0.5">
                  {userProfile?.totalScore || 0} pts
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 dark:bg-dark-950 border border-slate-150 dark:border-white/5 rounded-xl text-center">
                <span className="text-[9px] font-bold font-mono text-slate-400 uppercase block">INTERVIEWS RUN</span>
                <div className="text-lg font-mono font-bold text-slate-800 dark:text-slate-300 mt-0.5">
                  {userProfile?.sessionsCount || 0}
                </div>
              </div>
            </div>

            {/* Tab Swapping Header */}
            <div className="flex border-b border-slate-150 dark:border-white/5 mt-4">
              <button
                type="button"
                onClick={() => setActiveTab("goals")}
                className={`flex-1 pb-1.5 text-[10px] font-bold font-mono border-b-2 text-center transition cursor-pointer ${
                  activeTab === "goals"
                    ? "border-gold-500 text-gold-500"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                DAILY GOALS
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("leaderboard");
                  fetchLeaderboardData();
                }}
                className={`flex-1 pb-1.5 text-[10px] font-bold font-mono border-b-2 text-center transition cursor-pointer ${
                  activeTab === "leaderboard"
                    ? "border-gold-500 text-gold-500"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                LEADERBOARD
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("achievements")}
                className={`flex-1 pb-1.5 text-[10px] font-bold font-mono border-b-2 text-center transition cursor-pointer ${
                  activeTab === "achievements"
                    ? "border-gold-500 text-gold-500"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                BADGES
              </button>
            </div>

            {/* Tab Content Box */}
            <div className="pt-3 min-h-[170px] max-h-[185px] overflow-y-auto pr-0.5">
              {activeTab === "goals" ? (
                <div className="space-y-1.5 text-left">
                  {userProfile?.dailyGoals?.map((goal) => (
                    <div
                      key={goal.id}
                      onClick={() => toggleGoal(goal.id)}
                      className="flex items-start gap-2.5 p-2 bg-slate-50/50 dark:bg-dark-950/30 border border-slate-100 dark:border-white/5 rounded-xl hover:bg-slate-50 dark:hover:bg-dark-950 transition cursor-pointer"
                    >
                      <button className="text-slate-400 hover:text-gold-500 mt-0.5 transition shrink-0">
                        {goal.completed ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 fill-current dark:text-emerald-400" />
                        ) : (
                          <Circle className="w-4.5 h-4.5 text-slate-350 dark:text-white/20" />
                        )}
                      </button>
                      <div className="space-y-0.5">
                        <p className={`text-xs leading-normal font-sans ${
                          goal.completed ? "line-through text-slate-400 dark:text-white/40 font-normal" : "text-slate-700 dark:text-slate-200 font-medium"
                        }`}>
                          {goal.text}
                        </p>
                        {goal.targetValue && !goal.completed && (
                          <span className="text-[9px] font-mono font-bold bg-gold-500/10 text-gold-600 dark:text-gold-400 px-1.5 py-0.25 rounded">
                            Target: {goal.targetValue}{goal.category === "score" ? "%" : "x"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!userProfile?.dailyGoals || userProfile.dailyGoals.length === 0) && (
                    <p className="text-[11px] text-slate-400 text-center py-4">No daily goals assigned.</p>
                  )}
                </div>
              ) : activeTab === "leaderboard" ? (
                <div className="space-y-1">
                  {loadingLeaderboard ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gold-500" />
                      <span className="text-[10px] font-mono text-slate-400">LOADING SCOREBOARD...</span>
                    </div>
                  ) : (
                    leaderboard.map((player, index) => {
                      const isMe = player.uid === currentUser?.uid;
                      const rank = index + 1;
                      return (
                        <div
                          key={player.uid}
                          className={`flex items-center justify-between p-2 rounded-xl border transition ${
                            isMe 
                              ? "bg-gold-500/10 border-gold-500/45 shadow-[0_0_10px_rgba(185,147,98,0.1)]" 
                              : "bg-slate-50/50 dark:bg-dark-950/30 border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-dark-950"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Rank Indicator */}
                            <div className="w-5 shrink-0 text-center font-mono font-bold text-xs">
                              {rank === 1 ? (
                                <span className="text-gold-500" title="1st Place">🏆</span>
                              ) : rank === 2 ? (
                                <span className="text-slate-400" title="2nd Place">🥈</span>
                              ) : rank === 3 ? (
                                <span className="text-amber-600" title="3rd Place">🥉</span>
                              ) : (
                                <span className="text-slate-400 dark:text-white/30">{rank}</span>
                              )}
                            </div>

                            {/* Nickname and streak */}
                            <div className="text-left truncate min-w-0">
                              <h5 className={`text-xs font-bold truncate ${isMe ? "text-gold-500" : "text-slate-750 dark:text-slate-200"}`}>
                                {player.displayName || "Student"}
                              </h5>
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                                <Flame className="w-3 h-3 text-amber-500" />
                                <span>{player.streak || 1}d Streak</span>
                              </div>
                            </div>
                          </div>

                          {/* Score and count */}
                          <div className="text-right shrink-0">
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                              {player.totalScore} pts
                            </span>
                            <p className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">
                              {player.sessionsCount} runs
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {leaderboard.length === 0 && !loadingLeaderboard && (
                    <p className="text-[11px] text-slate-400 text-center py-4">Scoreboard is currently empty.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-left">
                  {(() => {
                    const achievementsList = getAchievements(userProfile, pastSessions);
                    const unlockedCount = achievementsList.filter(a => a.isUnlocked).length;
                    return (
                      <>
                        <div className="p-2 bg-gold-500/5 rounded-xl border border-gold-500/10 flex items-center justify-between mb-1 text-xs">
                          <span className="font-mono text-[9px] text-slate-400 font-semibold uppercase">UNLOCKED BADGES:</span>
                          <span className="font-mono font-bold text-gold-500">
                            {unlockedCount} / {achievementsList.length}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {achievementsList.map((ach) => {
                            const IconComponent = ACHIEVEMENT_ICONS[ach.iconName] || Trophy;
                            return (
                              <div
                                key={ach.id}
                                className={`flex items-start gap-2.5 p-2 border rounded-xl transition ${
                                  ach.isUnlocked
                                    ? "bg-gold-500/5 border-gold-500/20 text-slate-800 dark:text-slate-200"
                                    : "bg-slate-50/30 dark:bg-dark-950/20 border-slate-100 dark:border-white/5 opacity-60"
                                }`}
                              >
                                <div className={`p-1.5 rounded-lg shrink-0 ${
                                  ach.isUnlocked
                                    ? "bg-gold-500 text-black shadow-sm"
                                    : "bg-slate-200 dark:bg-dark-800 text-slate-400"
                                }`}>
                                  <IconComponent className="w-3.5 h-3.5" />
                                </div>
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <h5 className={`text-[11px] font-bold truncate ${ach.isUnlocked ? "text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                                      {ach.title}
                                    </h5>
                                    {ach.isUnlocked ? (
                                      <span className="text-[6.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.25 rounded uppercase">
                                        UNLOCKED
                                      </span>
                                    ) : (
                                      <span className="text-[6.5px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-dark-950 px-1 py-0.25 rounded uppercase">
                                        LOCKED
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-slate-400 dark:text-slate-400 leading-normal font-sans">
                                    {ach.description}
                                  </p>
                                  {!ach.isUnlocked && (
                                    <div className="space-y-0.5 pt-1">
                                      <div className="flex justify-between items-center text-[8px] font-mono text-slate-400">
                                        <span>Req: {ach.requirement}</span>
                                        <span>{ach.progressText}</span>
                                      </div>
                                      <div className="h-1 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-slate-400 dark:bg-white/30 rounded-full transition-all"
                                          style={{ width: `${ach.progressPercent}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          <div className="text-center pt-2 border-t border-slate-100 dark:border-white/10 mt-2">
            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-gold-500" /> COMPLETE MORE MOCK SESSIONS TO SCALE UP
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
