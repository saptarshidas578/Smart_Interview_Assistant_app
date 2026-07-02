import { useState, useEffect } from "react";
import {
  Briefcase,
  User,
  Settings,
  Flame,
  Clock,
  HelpCircle,
  FileText,
  UploadCloud,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Brain,
  TrendingUp,
  Award
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { JobRole, IntervewerPersonality, InterviewMode, DifficultyLevel, InterviewConfig, SpecialRoundType, InterviewSession, UserProfile } from "../types";
import AuthAndGamification from "./AuthAndGamification";

interface SetupScreenProps {
  onStart: (config: InterviewConfig) => void;
  isLoading: boolean;
  pastSessions: InterviewSession[];
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  onProfileUpdate: (newProfile: UserProfile) => void;
}

const COMPANY_PRESETS = [
  { name: "Google", color: "from-blue-500 to-red-500" },
  { name: "Amazon", color: "from-amber-500 to-orange-600" },
  { name: "Microsoft", color: "from-blue-600 to-teal-500" },
  { name: "Apple", color: "from-gray-700 to-gray-900" },
  { name: "Meta", color: "from-indigo-500 to-blue-600" },
  { name: "NVIDIA", color: "from-emerald-500 to-green-600" },
  { name: "OpenAI", color: "from-purple-600 to-pink-600" },
  { name: "Uber", color: "from-slate-800 to-black" }
];

export default function SetupScreen({ 
  onStart, 
  isLoading, 
  pastSessions,
  currentUser,
  userProfile,
  onProfileUpdate
}: SetupScreenProps) {
  const [role, setRole] = useState<string>(JobRole.SOFTWARE_ENGINEER_INTERN);
  const [personality, setPersonality] = useState<IntervewerPersonality>(IntervewerPersonality.FRIENDLY_HR);
  const [mode, setMode] = useState<InterviewMode>(InterviewMode.QUICK_PRACTICE);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DifficultyLevel.MEDIUM);
  const [company, setCompany] = useState<string>("Generic");
  const [duration, setDuration] = useState<number>(15);
  const [questionLimit, setQuestionLimit] = useState<number>(5);
  const [resumeText, setResumeText] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [specialRound, setSpecialRound] = useState<SpecialRoundType>(SpecialRoundType.STANDARD);

  // Dynamic state for knowledge graph based on history
  const [knowledgeProfile, setKnowledgeProfile] = useState<Record<string, number>>({
    Python: 0,
    DSA: 0,
    DBMS: 0,
    "Operating System": 0,
    Networking: 0,
  });

  useEffect(() => {
    if (pastSessions && pastSessions.length > 0) {
      // Analyze weaknesses dynamically from previous low evaluation scores or topics
      let dsaScore = 0;
      let dbmsScore = 0;
      let osScore = 0;
      let netScore = 0;
      let pyScore = 0;

      pastSessions.forEach(session => {
        const roleLower = session.config.role.toLowerCase();
        const scoreSum = session.turns.reduce((acc, t) => acc + (t.evaluation?.score || 80), 0);
        const avgScore = session.turns.length > 0 ? scoreSum / session.turns.length : 80;
        const normalized = Math.round(avgScore / 10);

        if (roleLower.includes("dsa") || roleLower.includes("algorithms") || session.config.specialRound?.includes("Explanation")) {
          dsaScore = Math.max(dsaScore, normalized);
        } else if (roleLower.includes("database") || session.config.specialRound?.includes("Database") || session.config.specialRound?.includes("SQL")) {
          dbmsScore = Math.max(dbmsScore, normalized);
        } else if (roleLower.includes("backend") || session.config.specialRound?.includes("API")) {
          pyScore = Math.max(pyScore, normalized);
        } else if (roleLower.includes("network") || roleLower.includes("security")) {
          netScore = Math.max(netScore, normalized);
        } else {
          osScore = Math.max(osScore, normalized);
        }
      });

      setKnowledgeProfile({
        Python: pyScore,
        DSA: dsaScore,
        DBMS: dbmsScore,
        "Operating System": osScore,
        Networking: netScore,
      });
    } else {
      setKnowledgeProfile({
        Python: 0,
        DSA: 0,
        DBMS: 0,
        "Operating System": 0,
        Networking: 0,
      });
    }
  }, [pastSessions]);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    onStart({
      role,
      personality,
      mode,
      difficulty,
      company,
      durationMinutes: duration,
      questionLimit,
      resumeText,
      jobDescription,
      specialRound
    });
  };

  const loadMockResume = () => {
    setResumeText(`SAPTARSHI DEY
saptarshid2007@gmail.com | github.com/saptarshidey

OBJECTIVE:
Passionate Frontend Engineer with experience building responsive interfaces in React, Tailwind, and TypeScript. Looking for a high-impact internship.

TECHNICAL SKILLS:
- Languages: JavaScript, TypeScript, Python, HTML/CSS
- Frameworks/Libraries: React 18, Next.js, Express, Tailwind CSS, Redux
- Tools: Git, GitHub, Docker, Firebase, Vite

PROJECTS:
1. Interactive Dev Dashboard - React & Tailwind
- Engineered a full-featured workspace management visual board with draggable layouts.
- Integrated standard client local state saving, improving cold boot loads by 40%.
2. Server-Authoritative Tic-Tac-Toe Game
- Built multiplayer game room synchronization using WebSockets and Express.
- Enforced reliable turn-based validation and auto-reconnection checks.`);
  };

  const loadMockJD = () => {
    setJobDescription(`TITLE: Frontend Engineering Intern (React)
COMPANY: TechCorp Inc.

RESPONSIBILITIES:
- Implement highly responsive UI modules using React and Tailwind CSS.
- Collaborate with backend engineers to integrate REST APIs and mock services.
- Help optimize front-end assets and data serialization to reduce user load times.
- Ensure cross-browser safety, high accessibility standards (WCAG), and test coverage.

QUALIFICATIONS:
- Proficient in React, JavaScript, TypeScript, and modern styling tools like Tailwind.
- Solid understanding of web state preservation, caches, and local storage mechanisms.
- Eager to learn, solve structural system bottlenecks, and adapt in a high-speed team.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Visual Header */}
      <div className="text-center mb-10 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gold-500/10 dark:bg-gold-500/10 border border-gold-500/20 text-gold-500 rounded-full text-[10px] font-mono font-bold tracking-widest animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-gold-400" />
          <span>VIRTUAL SIMULATION ENGINE READY</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white font-sans">
          AI Interview <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B99362] to-[#D4B483]">Copilot</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-sm">
          Perfect your job readiness with our adaptive, real-time virtual interviewer. Recovers speech fillers, tracks eye contact, and outputs full STAR performance scorecards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column - main setup form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-6 md:p-8 rounded-3xl shadow-xl">
        
        {/* Personalized Weakness Model / Knowledge Graph Header */}
        <div className="p-6 bg-slate-50 dark:bg-dark-950 rounded-2xl border border-slate-100 dark:border-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gold-500/10 text-gold-500 rounded-xl">
                <Brain className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  Candidate Knowledge Profile & AI Memory
                  {pastSessions && pastSessions.length > 0 && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider">
                      RECOVERY SYNCHRONIZED
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {pastSessions && pastSessions.length > 0
                    ? `Retrieved ${pastSessions.length} past interview logs. Future questions will automatically focus on addressing and strengthening your weaknesses.`
                    : "Baseline candidate knowledge profile. Complete interviews to dynamically update your AI-modeled mastery ratings."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-lg text-xs text-slate-600 dark:text-slate-400 font-mono">
              <TrendingUp className="w-3.5 h-3.5 text-gold-500" />
              <span>Skill Focus: {pastSessions && pastSessions.length > 0 ? (Object.entries(knowledgeProfile).find(([_, score]) => (score as number) <= 5 && (score as number) > 0)?.[0] || Object.entries(knowledgeProfile).find(([_, score]) => (score as number) <= 5)?.[0] || "None") : "Initiate your first session!"}</span>
            </div>
          </div>
 
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {Object.entries(knowledgeProfile).map(([skill, val]) => {
              const numVal = val as number;
              const isWeak = numVal > 0 && numVal <= 5;
              const isUnpracticed = numVal === 0;
              return (
                <div key={skill} className={`p-3 rounded-xl border transition ${
                  isUnpracticed
                    ? "bg-slate-50/50 dark:bg-dark-900/30 border-slate-200 dark:border-white/5 opacity-80"
                    : isWeak 
                      ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 text-amber-500" 
                      : "bg-slate-100/50 dark:bg-dark-900 border-slate-200 dark:border-white/5"
                }`}>
                  <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                    <span className="truncate">{skill}</span>
                    <span className="font-mono">{numVal}/10</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isUnpracticed ? "bg-slate-300 dark:bg-white/15" : isWeak ? "bg-amber-500" : "bg-gold-500"
                      }`} 
                      style={{ width: `${numVal * 10}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono font-bold mt-1.5 block opacity-75">
                    {isUnpracticed ? "⚙️ PENDING PRACTICE" : isWeak ? "⚠️ AUTO-FOCUSING WEAKNESS" : "✓ PROFICIENT"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Core Setup Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Job Role Selection */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Briefcase className="w-4 h-4 text-gold-500" />
              Target Job Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(JobRole).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`p-3 text-xs font-medium border rounded-xl text-left transition ${
                    role === r
                      ? "border-gold-500 bg-gold-500/5 dark:bg-gold-500/10 text-gold-500 font-semibold shadow-sm"
                      : "border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {r}
                </button>
              ))}
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Or enter custom job role..."
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full text-xs p-3 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-dark-950/50 focus:outline-none focus:border-gold-500 text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* 2. Interviewer Personality */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <User className="w-4 h-4 text-gold-500" />
              Interviewer Personality
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(IntervewerPersonality).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPersonality(p)}
                  className={`p-3 text-[11px] font-medium border rounded-xl text-left transition ${
                    personality === p
                      ? "border-gold-500 bg-gold-500/5 dark:bg-gold-500/10 text-gold-500 font-semibold shadow-sm"
                      : "border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Configurations row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2 border-t border-slate-100 dark:border-white/10">
          
          {/* Special Round Type Selection */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Award className="w-4 h-4 text-gold-500" />
              Special Round Focus
            </label>
            <select
              value={specialRound}
              onChange={(e) => setSpecialRound(e.target.value as SpecialRoundType)}
              className="w-full text-xs p-3 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-dark-950/50 text-slate-800 dark:text-slate-300 focus:outline-none focus:border-gold-500 font-medium"
            >
              {Object.values(SpecialRoundType).map((sr) => (
                <option key={sr} className="bg-slate-50 dark:bg-dark-900" value={sr}>{sr}</option>
              ))}
            </select>
          </div>

          {/* Mode Selector */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Layers className="w-4 h-4 text-gold-500" />
              Interview Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as InterviewMode)}
              className="w-full text-xs p-3 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-dark-950/50 text-slate-800 dark:text-slate-300 focus:outline-none focus:border-gold-500"
            >
              {Object.values(InterviewMode).map((m) => (
                <option key={m} className="bg-slate-50 dark:bg-dark-900" value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Level */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Flame className="w-4 h-4 text-gold-500" />
              Difficulty Level
            </label>
            <div className="flex border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-dark-950/50">
              {Object.values(DifficultyLevel).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-3 text-xs font-semibold transition ${
                    difficulty === d
                      ? "bg-gold-500 text-black font-extrabold"
                      : "hover:bg-slate-100 dark:hover:bg-dark-850 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Company Target Preset */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Settings className="w-4 h-4 text-gold-500" />
              Company Interview Protocol
            </label>
            <input
              type="text"
              placeholder="Google, Amazon, etc."
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full text-xs p-3 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-dark-950/50 text-slate-800 dark:text-white focus:outline-none focus:border-gold-500"
            />
          </div>
        </div>

        {/* Company Quick-Selection Panel */}
        <div className="space-y-2.5 pt-2">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">POPULAR COMPANY PRESETS</span>
          <div className="flex flex-wrap gap-2">
            {COMPANY_PRESETS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setCompany(c.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  company.toLowerCase() === c.name.toLowerCase()
                    ? `bg-slate-950 dark:bg-gold-500 text-white dark:text-black border-transparent font-bold`
                    : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-gold-500"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders for limits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-white/10">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gold-500" /> Interview Max Duration</span>
              <span className="text-gold-500 font-mono">{duration} Minutes</span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-gold-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-dark-950 rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2"><HelpCircle className="w-4 h-4 text-gold-500" /> Target Question Limit</span>
              <span className="text-gold-500 font-mono">{questionLimit} Questions</span>
            </div>
            <input
              type="range"
              min={2}
              max={15}
              step={1}
              value={questionLimit}
              onChange={(e) => setQuestionLimit(Number(e.target.value))}
              className="w-full accent-gold-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-dark-950 rounded-lg"
            />
          </div>
        </div>

        {/* Context files pasting / Uploading */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-white/10">
          {/* Resume Panel */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <FileText className="w-4 h-4 text-gold-500" />
                Resume Text (PDF Extraction Copy)
              </label>
              <button
                type="button"
                onClick={loadMockResume}
                className="text-[10px] font-mono font-bold text-gold-500 hover:underline cursor-pointer"
              >
                AUTO-FILL SAMPLE RESUME
              </button>
            </div>
            <div className="relative group">
              <textarea
                placeholder="Paste the raw text of your resume or drag in context details..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={6}
                className="w-full text-xs p-3.5 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-dark-950/50 text-slate-800 dark:text-white focus:outline-none focus:border-gold-500"
              />
              {resumeText.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 group-hover:text-gold-500/50 transition duration-200">
                  <UploadCloud className="w-8 h-8 mb-1 text-slate-300 dark:text-slate-700" />
                  <span className="text-[10px] font-medium uppercase font-mono tracking-wider">Drag & Drop Resume text</span>
                </div>
              )}
            </div>
          </div>

          {/* JD Panel */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <FileText className="w-4 h-4 text-gold-500" />
                Job Description (JD Match context)
              </label>
              <button
                type="button"
                onClick={loadMockJD}
                className="text-[10px] font-mono font-bold text-gold-500 hover:underline cursor-pointer"
              >
                AUTO-FILL TARGET JD
              </button>
            </div>
            <div className="relative group">
              <textarea
                placeholder="Paste the target job description to ask highly relevant company questions..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={6}
                className="w-full text-xs p-3.5 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-dark-950/50 text-slate-800 dark:text-white focus:outline-none focus:border-gold-500"
              />
              {jobDescription.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 group-hover:text-gold-500/50 transition duration-200">
                  <UploadCloud className="w-8 h-8 mb-1 text-slate-300 dark:text-slate-700" />
                  <span className="text-[10px] font-medium uppercase font-mono tracking-wider">Drag & Drop JD text</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col items-center justify-center gap-3 pt-6 border-t border-slate-100 dark:border-white/10">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto min-w-[280px] bg-gradient-to-r from-[#B99362] to-[#D4B483] hover:from-[#A37E50] hover:to-[#B99362] text-black font-extrabold py-3.5 px-8 rounded-2xl shadow-[0_0_20px_rgba(185,147,98,0.25)] hover:shadow-[0_0_30px_rgba(185,147,98,0.4)] transition duration-200 flex items-center justify-center gap-2.5 cursor-pointer animate-pulse-gold"
          >
            {isLoading ? (
              <>
                <div className="w-4.5 h-4.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>BOOTING SIMULATION ENGINE...</span>
              </>
            ) : (
              <>
                <span className="tracking-widest text-xs uppercase font-sans">INITIATE AI INTERVIEW</span>
                <ArrowRight className="w-4.5 h-4.5" />
              </>
            )}
          </button>
          
          <div className="flex items-center gap-2 text-xs text-amber-500 font-mono">
            <ShieldAlert className="w-4 h-4" />
            <span>Ensure camera & microphone permissions are authorized in the iframe.</span>
          </div>
        </div>
      </form>
    </div>

    {/* Right column - profile, leaderboard & gamification */}
    <div className="lg:col-span-1">
      <AuthAndGamification
        currentUser={currentUser}
        userProfile={userProfile}
        onProfileUpdate={onProfileUpdate}
        pastSessions={pastSessions}
      />
    </div>
  </div>
</div>
);
}
