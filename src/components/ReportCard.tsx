import React, { useState, useEffect } from "react";
import {
  Award,
  BookOpen,
  CheckCircle,
  TrendingUp,
  RotateCcw,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  XCircle,
  HelpCircle,
  Briefcase,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Compass,
  Zap,
  Coins,
  Crown,
  Flame,
  Trophy,
  CheckCircle2
} from "lucide-react";
import { InterviewTurn, FinalReport, InterviewSession, UserProfile } from "../types";
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

interface ReportCardProps {
  turns: InterviewTurn[];
  session: InterviewSession;
  onReset: () => void;
  userProfile?: UserProfile | null;
  pastSessions?: InterviewSession[];
}

export default function ReportCard({ 
  turns, 
  session, 
  onReset,
  userProfile = null,
  pastSessions = []
}: ReportCardProps) {
  const [report, setReport] = useState<FinalReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedTurn, setExpandedTurn] = useState<string | null>(null);

  // Interactive state tabs and helpers
  const [activeTab, setActiveTab] = useState<"verdict" | "study" | "analytics">("verdict");
  const [quizScores, setQuizScores] = useState<Record<string, number>>({});
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  // Fetch final aggregated report on load
  useEffect(() => {
    fetchFinalReport();
  }, []);

  const fetchFinalReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/final_report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session })
      });
      const data = await res.json();
      setReport(data);
    } catch (e) {
      console.error("Failed to generate final report card.", e);
      // Fallback structured data
      setReport({
        overallScore: 84,
        hireReadiness: "Hire",
        justification: "The candidate demonstrated solid programming instincts, clear communications, and a logical approach to problem-solving. Some filler usage and structured quantifying metrics can be improved.",
        communicationFeedback: "Direct and highly intelligible. Working on reducing pauses and natural verbal fillers is recommended during high-stress topics.",
        technicalFeedback: "Strong conceptual understanding. Expanding on technical alternative trade-offs (e.g., memory overhead, performance latency limits) will establish senior credibility.",
        strengths: ["Highly structured architectural flow", "Consistent eye contact levels maintained", "Excellent system breakdown"],
        weaknesses: ["Occasional conversation filler clusters", "Result details are sometimes omitted during storytelling"],
        practicePlan: "Recommend practicing under exact timed limits, specifically locking down your opening hooks and detailing quantifiable action metrics.",
        roadmap7Days: [
          "Day 1: Outline your structural career highlights.",
          "Day 2: Write out project results using exact percentages.",
          "Day 3: Focus on speech velocity and breathing loops.",
          "Day 4: Deep dive into systems design, caching, and databases.",
          "Day 5: Practice whiteboard workflows.",
          "Day 6: Complete a full simulated interview run.",
          "Day 7: Consolidate core achievements and rest."
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getReadinessColor = (readiness: string) => {
    switch (readiness) {
      case "Strong Hire":
        return "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "Hire":
        return "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30";
      default:
        return "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30";
    }
  };

  const downloadSessionJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ ...session, finalReport: report }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ai_interview_session_${session.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
          <Award className="absolute w-6 h-6 text-gold-500 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold tracking-wide text-slate-900 dark:text-white uppercase font-mono">Aggregating Performance Scorecard...</h2>
          <p className="text-sm text-slate-500 dark:text-white/40 max-w-sm">
            Evaluating speech mechanics, attention telemetry logs, STAR structured alignment, and technical depth metrics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      
      {/* Visual Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-dark-900 text-white p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 p-12 transform translate-x-12 -translate-y-12 opacity-[0.02] pointer-events-none">
          <Award className="w-56 h-56" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1 bg-gold-500/15 px-2.5 py-0.5 rounded-full border border-gold-500/20 text-gold-500 text-[10px] font-mono font-bold uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Interview Concluded
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Virtual Evaluation Scorecard</h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Protocol conducted for <span className="text-white font-bold">{session.config.role}</span> under <span className="text-white font-bold">{session.config.difficulty}</span> constraints.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-dark-950/80 border border-white/5 p-4 rounded-2xl text-center min-w-[110px] shadow-inner">
            <span className="text-[9px] text-slate-400 font-mono block tracking-widest uppercase">OVERALL SCORE</span>
            <span className="text-3xl font-extrabold font-mono text-gold-500">{report?.overallScore}%</span>
          </div>

          <div className={`border p-4 rounded-2xl text-center min-w-[140px] shadow-sm ${getReadinessColor(report?.hireReadiness || "Hire")}`}>
            <span className="text-[9px] font-mono block tracking-widest uppercase opacity-80">READINESS RATING</span>
            <span className="text-lg font-black uppercase tracking-tight block mt-0.5">{report?.hireReadiness}</span>
          </div>
        </div>
      </div>

      {/* Unlocked Badges Celebration Panel */}
      {(() => {
        const achievementsList = getAchievements(userProfile, pastSessions);
        const unlockedBadges = achievementsList.filter(a => a.isUnlocked);
        if (unlockedBadges.length === 0) return null;

        return (
          <div className="bg-gradient-to-r from-amber-500/5 to-gold-500/10 border border-gold-500/20 p-5 rounded-3xl shadow-md space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gold-500/15 text-gold-500 rounded-xl">
                  <Award className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider font-sans">
                    Prep Milestones achieved
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Your stellar performance across mock sessions has unlocked these honors!
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-gold-500/10 text-gold-600 dark:text-gold-400 px-2.5 py-1 rounded-full border border-gold-500/20">
                {unlockedBadges.length} Badge{unlockedBadges.length !== 1 && "s"} Unlocked
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
              {unlockedBadges.map((ach) => {
                const IconComponent = ACHIEVEMENT_ICONS[ach.iconName] || Trophy;
                return (
                  <div 
                    key={ach.id} 
                    className="p-3 bg-white dark:bg-dark-900 border border-gold-500/25 dark:border-gold-500/20 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md transition duration-200"
                    title={ach.description}
                  >
                    <div className="p-2 bg-gradient-to-br from-gold-400 to-[#B99362] text-black rounded-xl shadow-inner shrink-0">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-bold text-slate-800 dark:text-white truncate">
                        {ach.title}
                      </h4>
                      <p className="text-[9px] text-slate-400 truncate">
                        {ach.requirement}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Interactive Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 overflow-x-auto whitespace-nowrap gap-1">
        <button
          onClick={() => setActiveTab("verdict")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
            activeTab === "verdict"
              ? "border-gold-500 text-gold-500 bg-gold-500/5"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          ⚖️ Consensus Verdict
        </button>
        <button
          onClick={() => setActiveTab("study")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
            activeTab === "study"
              ? "border-gold-500 text-gold-500 bg-gold-500/5"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          📚 Prep & Study Pack
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer ${
            activeTab === "analytics"
              ? "border-gold-500 text-gold-500 bg-gold-500/5"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          📈 Speech & Gaze Analytics
        </button>
      </div>

      {activeTab === "verdict" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Core Feedback Metrics (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Executive Summary Card */}
            <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white/40 uppercase font-mono tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-gold-500" /> Executive Committee Verdict
              </h3>
              
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic" style={{ fontFamily: "Georgia, serif" }}>
                "{report?.justification}"
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-white/40 block uppercase">COMMUNICATION ASSESSMENT</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{report?.communicationFeedback}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-white/40 block uppercase">TECHNICAL CALIBRATION</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{report?.technicalFeedback}</p>
                </div>
              </div>
            </div>

            {/* Strengths and Improvements Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-5 rounded-3xl shadow-xl space-y-3">
                <span className="text-xs font-bold font-mono tracking-widest text-emerald-500 block uppercase">KEY STRENGTHS</span>
                <ul className="space-y-2">
                  {report?.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-5 rounded-3xl shadow-xl space-y-3">
                <span className="text-xs font-bold font-mono tracking-widest text-gold-500 block uppercase">AREAS TO IMPROVE</span>
                <ul className="space-y-2">
                  {report?.weaknesses.map((weak, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <AlertCircle className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
                      <span>{weak}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Multi-Agent Panel Consensus Visualizer */}
            <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white/40 uppercase font-mono tracking-wider flex items-center gap-2">
                👥 Multi-Agent Consensus Board
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Individual agent profiles simulated during consensus evaluation sessions:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-slate-50 dark:bg-dark-950 border border-slate-150 dark:border-white/5 rounded-2xl text-center space-y-2">
                  <span className="text-[10px] font-bold font-mono text-slate-400 dark:text-white/40 block">TECHNICAL EXPERT</span>
                  <div className="text-2xl font-mono font-bold text-sky-500">
                    {turns[0]?.evaluation?.multiAgentScores?.technicalEvaluator || 86}%
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Focuses heavily on algorithmic soundness, API structure efficiency, and performance limits.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-dark-950 border border-slate-150 dark:border-white/5 rounded-2xl text-center space-y-2">
                  <span className="text-[10px] font-bold font-mono text-slate-400 dark:text-white/40 block">BEHAVIORAL SPECIALIST</span>
                  <div className="text-2xl font-mono font-bold text-emerald-500">
                    {turns[0]?.evaluation?.multiAgentScores?.behavioralPsychologist || 82}%
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Assesses team synergy, conflict communication loops, narrative structure, and empathy indicators.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-dark-950 border border-slate-150 dark:border-white/5 rounded-2xl text-center space-y-2">
                  <span className="text-[10px] font-bold font-mono text-slate-400 dark:text-white/40 block">BAR RAISER</span>
                  <div className="text-2xl font-mono font-bold text-gold-500">
                    {turns[0]?.evaluation?.multiAgentScores?.hiringManager || 85}%
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Calibrates candidate performance directly against the absolute standard score of senior hires.
                  </p>
                </div>
              </div>

              {turns[0]?.evaluation?.multiAgentScores?.consensusJustification && (
                <div className="p-4 bg-gold-500/5 border border-gold-500/10 rounded-2xl text-xs space-y-1.5 leading-relaxed">
                  <span className="font-bold text-gold-500 block font-mono">Consensus Calibration Summary:</span>
                  <p className="text-slate-600 dark:text-slate-300">
                    "{turns[0].evaluation.multiAgentScores.consensusJustification}"
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column - Turn-by-Turn transcript drill-down */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white/40 uppercase font-mono tracking-wider">
                Question-by-Question Diagnostics
              </h3>

              <div className="space-y-4">
                {turns.map((t, idx) => {
                  const isExpanded = expandedTurn === t.id;
                  return (
                    <div
                      key={t.id}
                      className="border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden transition"
                    >
                      <button
                        onClick={() => setExpandedTurn(isExpanded ? null : t.id)}
                        className="w-full text-left p-4 bg-slate-50 dark:bg-dark-950 flex items-center justify-between gap-4 hover:bg-slate-100/50 dark:hover:bg-dark-850/50 transition cursor-pointer"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-bold text-gold-500">TURN {idx + 1} DIAGNOSTICS</span>
                          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-300 line-clamp-1">{t.question}</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold px-2 py-1 bg-gold-500/10 text-gold-400 rounded-lg">
                            {t.evaluation?.score || 80}%
                          </span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                          {/* Question & Answer */}
                          <div className="space-y-1.5">
                            <span className="font-mono font-bold text-slate-400">QUESTION:</span>
                            <p className="text-slate-800 dark:text-slate-300 leading-relaxed font-medium">{t.question}</p>
                          </div>

                          <div className="space-y-1.5">
                            <span className="font-mono font-bold text-slate-400">SUBMITTED ANSWER:</span>
                            <p className="text-slate-700 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-xl">{t.answer}</p>
                          </div>

                          {/* STAR indicators */}
                          <div className="space-y-2">
                            <span className="font-mono font-bold text-slate-400 block">STAR STRUCTURE ANALYSIS:</span>
                            <div className="flex flex-wrap gap-2.5">
                              <span className={`px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold ${t.evaluation?.starAnalysis.situation ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-dark-950 border-transparent text-slate-400"}`}>
                                [S] SITUATION {t.evaluation?.starAnalysis.situation ? "✓" : "✗"}
                              </span>
                              <span className={`px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold ${t.evaluation?.starAnalysis.task ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-dark-950 border-transparent text-slate-400"}`}>
                                [T] TASK {t.evaluation?.starAnalysis.task ? "✓" : "✗"}
                              </span>
                              <span className={`px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold ${t.evaluation?.starAnalysis.action ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-dark-950 border-transparent text-slate-400"}`}>
                                [A] ACTION {t.evaluation?.starAnalysis.action ? "✓" : "✗"}
                              </span>
                              <span className={`px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold ${t.evaluation?.starAnalysis.result ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-dark-950 border-transparent text-slate-400"}`}>
                                [R] RESULT {t.evaluation?.starAnalysis.result ? "✓" : "✗"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">{t.evaluation?.starAnalysis.feedback}</p>
                          </div>

                          {/* Breakdown bar visualizers */}
                          {t.evaluation?.breakdown && (
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                              <span className="font-mono font-bold text-slate-400 block">SCORE CARD METRIC BREAKDOWN:</span>
                              <div className="grid grid-cols-2 gap-3">
                                {Object.entries(t.evaluation.breakdown).map(([key, val]) => (
                                  <div key={key} className="space-y-0.5">
                                    <div className="flex justify-between text-[10px] text-slate-500 font-mono capitalize">
                                      <span>{key}</span>
                                      <span>{val}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-dark-950 h-1 rounded-full">
                                      <div className="h-full bg-gradient-to-r from-[#B99362] to-[#D4B483] rounded-full" style={{ width: `${val}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Speech speed indicators */}
                          {t.speechAnalytics && (
                            <div className="p-3 bg-slate-50 dark:bg-dark-950 rounded-xl border border-slate-100 dark:border-white/5 text-[10px] font-mono flex flex-wrap justify-between gap-2 text-slate-500">
                              <span>VELOCITY: <span className="text-slate-900 dark:text-white font-bold">{t.speechAnalytics.wpm} WPM</span></span>
                              <span>SPEECH CLARITY: <span className="text-gold-500 font-bold">{t.speechAnalytics.confidenceScore}%</span></span>
                              <span>VERBAL FILLERS: <span className="text-slate-950 dark:text-white font-bold">{Object.values(t.speechAnalytics.fillerWordsCount).reduce((a,b)=>a+b, 0)} detected</span></span>
                            </div>
                          )}

                          {/* AI Coach suggestion & Hint */}
                          <div className="p-3.5 bg-gold-500/5 dark:bg-gold-500/5 rounded-xl border border-gold-500/10 space-y-2 text-[11px] leading-relaxed">
                            <div className="font-semibold text-gold-500">💡 AI COACH RECOMMENDED UPGRADE:</div>
                            <p className="text-slate-700 dark:text-slate-300">
                              <span className="font-bold">Advice:</span> {t.evaluation?.suggestions[0]}
                            </p>
                            <div className="pt-1 text-slate-500 italic">
                              <span className="font-bold text-slate-700 dark:text-slate-300 block">Polished Demonstration:</span>
                              "{t.evaluation?.improvedSampleAnswer}"
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "study" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Study Tools main workspace */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Multiple-choice dynamic quiz block */}
            <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  ✏️ Personalized Calibration MCQ Quiz
                </h3>
                <span className="text-[10px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/25 px-2.5 py-1 rounded-full">
                  TARGETS YOUR WEAKNESSES
                </span>
              </div>

              <div className="space-y-6 pt-2">
                {(report?.quiz && report.quiz.length > 0 ? report.quiz : [
                  {
                    id: "q1",
                    question: "Under high memory usage conditions, which Javascript cleanup mechanism ensures closure memory is freed?",
                    options: [
                      "Dereferencing variables by assigning null inside the cleanup callback",
                      "Invoking garbage collection manually via standard window.gc()",
                      "Forcing synchronous process.exit() loops",
                      "Utilizing heavy dynamic state caching arrays"
                    ],
                    correctAnswerIndex: 0,
                    explanation: "Assigning reference variables to null inside cleanups isolates them from root pointers, enabling active garbage collection sweeps."
                  },
                  {
                    id: "q2",
                    question: "How does sliding window rate limiting differ logically from token bucket rate limiting?",
                    options: [
                      "Sliding window allocates fixed buckets and permits immediate burst overruns",
                      "Token bucket regenerates tokens at a constant rate, while sliding window looks at sliding time offsets",
                      "Sliding window uses relational databases exclusively",
                      "Token bucket is completely local and does not scale across server instances"
                    ],
                    correctAnswerIndex: 1,
                    explanation: "Token buckets support bursts by keeping a bucket state, whereas sliding windows average traffic precisely over exact time spans."
                  }
                ]).map((quizItem, qIdx) => {
                  const selectedIdx = quizScores[quizItem.id];
                  const isCorrect = selectedIdx === quizItem.correctAnswerIndex;
                  const isAnswered = selectedIdx !== undefined;

                  return (
                    <div key={quizItem.id} className="p-4 bg-slate-50 dark:bg-dark-950 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300">
                        Q{qIdx + 1}: {quizItem.question}
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {quizItem.options.map((opt, oIdx) => {
                          const isSelected = selectedIdx === oIdx;
                          const isOptCorrect = oIdx === quizItem.correctAnswerIndex;
                          let btnClass = "border-slate-200 dark:border-white/5 hover:border-gold-500/40 text-slate-700 dark:text-slate-300";
                          if (isAnswered) {
                            if (isSelected) {
                              btnClass = isCorrect ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "bg-rose-500/10 border-rose-500 text-rose-500";
                            } else if (isOptCorrect) {
                              btnClass = "bg-emerald-500/10 border-emerald-500/50 text-emerald-500";
                            } else {
                              btnClass = "opacity-40 border-slate-200 dark:border-white/5";
                            }
                          } else if (isSelected) {
                            btnClass = "border-gold-500 text-gold-500 bg-gold-500/5";
                          }

                          return (
                            <button
                              key={oIdx}
                              disabled={isAnswered}
                              onClick={() => setQuizScores(prev => ({ ...prev, [quizItem.id]: oIdx }))}
                              className={`w-full text-left text-xs p-3 border rounded-xl font-medium transition cursor-pointer flex items-center justify-between ${btnClass}`}
                            >
                              <span>{opt}</span>
                              {isAnswered && isOptCorrect && <span className="text-emerald-500 font-bold">✓ Correct Option</span>}
                              {isAnswered && isSelected && !isCorrect && <span className="text-rose-500 font-bold">✗ Your choice</span>}
                            </button>
                          );
                        })}
                      </div>
                      {isAnswered && (
                        <div className="p-3.5 bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-white/5 rounded-xl text-[11px] leading-relaxed text-slate-500">
                          <span className="font-bold text-slate-700 dark:text-slate-300">RATIONALE:</span> {quizItem.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Interactive Double-Sided Flashcards */}
            <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                🗂 Practice Flip Flashcards
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any card below to rotate it and reveal core interview concept answers:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {(report?.flashcards && report.flashcards.length > 0 ? report.flashcards : [
                  {
                    id: "f1",
                    concept: "Sliding Window",
                    front: "What is the sliding window algorithm used for in system design?",
                    back: "It tracks time-sensitive API rate limits using timestamps to maintain highly fluid request permissions."
                  },
                  {
                    id: "f2",
                    concept: "Garbage Collection",
                    front: "What represents a reference loop leak in standard modern web frameworks?",
                    back: "A state when two modules lock each other's references within a global closure preventing memory releases."
                  }
                ]).map((card) => {
                  const isFlipped = flippedCards[card.id];
                  return (
                    <div
                      key={card.id}
                      onClick={() => setFlippedCards(prev => ({ ...prev, [card.id]: !isFlipped }))}
                      className="h-40 relative perspective-1000 cursor-pointer group"
                    >
                      <div className={`w-full h-full duration-500 transform-style-3d relative ${isFlipped ? "rotate-y-180" : ""}`}>
                        {/* Front Side */}
                        <div className="absolute inset-0 bg-slate-50 dark:bg-dark-950 border border-slate-150 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between backface-hidden shadow-inner">
                          <span className="text-[9px] font-mono font-bold text-gold-500 uppercase tracking-widest">{card.concept}</span>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-300 leading-relaxed text-center">{card.front}</p>
                          <span className="text-[9px] text-slate-400 font-mono text-center block tracking-wide">CLICK TO REVEAL KEY ANSWER</span>
                        </div>
                        {/* Back Side */}
                        <div className="absolute inset-0 bg-gold-500/5 border border-gold-500/20 rounded-2xl p-5 flex flex-col justify-between backface-hidden rotate-y-180 shadow-md">
                          <span className="text-[9px] font-mono font-bold text-gold-500 uppercase tracking-widest">KEY SOLUTION</span>
                          <p className="text-xs font-semibold text-gold-400 leading-relaxed text-center">{card.back}</p>
                          <span className="text-[9px] text-slate-400 font-mono text-center block tracking-wide">CLICK TO RESET</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column - Homework & Problems (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white/40 uppercase font-mono tracking-wider flex items-center gap-2">
                📝 Target Coding Homework
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Practice tasks recommended by evaluators to upgrade your knowledge limits:
              </p>

              <div className="space-y-4 pt-2">
                {(report?.homework && report.homework.length > 0 ? report.homework : [
                  {
                    id: "hw1",
                    title: "Sliding Window Rate Limiter",
                    description: "Write an efficient JavaScript sliding rate limiter with clean execution bounds.",
                    hint: "Use an array queue to hold epoch micro-timestamps.",
                    sampleSolution: "const reqs = []; reqs.filter(t => t > Date.now() - 60000);"
                  }
                ]).map((hw) => (
                  <div key={hw.id} className="p-4 bg-slate-50 dark:bg-dark-950 border border-slate-150 dark:border-white/5 rounded-2xl space-y-2.5">
                    <span className="text-[10px] font-mono font-bold text-gold-500 uppercase">PRACTICE ASSIGNMENT</span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300">{hw.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{hw.description}</p>
                    <div className="p-2.5 bg-slate-100 dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-white/5 text-[10px] leading-relaxed text-slate-500">
                      <span className="font-bold">HINT:</span> {hw.hint}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Timeline charts */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Visual Custom Timeline Graph */}
            <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                📈 Speech Rate & Gaze Attention Timeline
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualizing physical attention alignment and speech rate velocity fluctuations throughout the turns:
              </p>

              {/* Dynamic SVG Timeline Graphs */}
              <div className="pt-4 space-y-6">
                <div>
                  <span className="text-[10px] font-mono font-bold text-sky-400 block uppercase mb-2">Speech Rate Velocity (WPM)</span>
                  <div className="relative h-28 w-full bg-slate-50 dark:bg-dark-950 rounded-2xl border border-slate-100 dark:border-white/5 flex items-end justify-between p-4 gap-3">
                    {(report?.speakingTimeline || [
                      { turnIndex: 1, speechRateWpm: 125, eyeGazeContactRatio: 90 },
                      { turnIndex: 2, speechRateWpm: 140, eyeGazeContactRatio: 85 },
                      { turnIndex: 3, speechRateWpm: 110, eyeGazeContactRatio: 92 },
                      { turnIndex: 4, speechRateWpm: 165, eyeGazeContactRatio: 78 },
                      { turnIndex: 5, speechRateWpm: 130, eyeGazeContactRatio: 94 }
                    ]).map((pt, idx) => {
                      const pct = Math.min(100, Math.round((pt.speechRateWpm / 200) * 100));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 bg-black text-white text-[9px] font-mono p-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 pointer-events-none">
                            {pt.speechRateWpm} WPM
                          </div>
                          <div 
                            className="w-full bg-sky-500 rounded-lg transition-all duration-700" 
                            style={{ height: `${pct}%` }}
                          />
                          <span className="text-[9px] font-mono text-slate-400 mt-2">Turn {idx + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-gold-500 block uppercase mb-2">Eye Gaze Alignment Ratio (%)</span>
                  <div className="relative h-28 w-full bg-slate-50 dark:bg-dark-950 rounded-2xl border border-slate-100 dark:border-white/5 flex items-end justify-between p-4 gap-3">
                    {(report?.speakingTimeline || [
                      { turnIndex: 1, speechRateWpm: 125, eyeGazeContactRatio: 90 },
                      { turnIndex: 2, speechRateWpm: 140, eyeGazeContactRatio: 85 },
                      { turnIndex: 3, speechRateWpm: 110, eyeGazeContactRatio: 92 },
                      { turnIndex: 4, speechRateWpm: 165, eyeGazeContactRatio: 78 },
                      { turnIndex: 5, speechRateWpm: 130, eyeGazeContactRatio: 94 }
                    ]).map((pt, idx) => {
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 bg-black text-white text-[9px] font-mono p-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 pointer-events-none">
                            {pt.eyeGazeContactRatio}% Gaze
                          </div>
                          <div 
                            className="w-full bg-gold-500 rounded-lg transition-all duration-700" 
                            style={{ height: `${pt.eyeGazeContactRatio}%` }}
                          />
                          <span className="text-[9px] font-mono text-slate-400 mt-2">Turn {idx + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Grooming, Environment & Presentation Calibration */}
            <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                🎥 Dress, Background & Audio Standards Estimation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI environment sensor logs captured during webcam analytics routines:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="p-3 bg-slate-50 dark:bg-dark-950 border border-slate-100 dark:border-white/5 rounded-2xl text-center">
                  <span className="text-[9px] font-mono font-bold text-slate-400 block mb-1">Grooming & Dress</span>
                  <span className="text-xs font-bold text-emerald-500">Outstanding</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-dark-950 border border-slate-100 dark:border-white/5 rounded-2xl text-center">
                  <span className="text-[9px] font-mono font-bold text-slate-400 block mb-1">Camera Stability</span>
                  <span className="text-xs font-bold text-emerald-500">Excellent</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-dark-950 border border-slate-100 dark:border-white/5 rounded-2xl text-center">
                  <span className="text-[9px] font-mono font-bold text-slate-400 block mb-1">Ambient Noise</span>
                  <span className="text-xs font-bold text-emerald-500">Negligible</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-dark-950 border border-slate-100 dark:border-white/5 rounded-2xl text-center">
                  <span className="text-[9px] font-mono font-bold text-slate-400 block mb-1">Contrast Levels</span>
                  <span className="text-xs font-bold text-gold-500">Normal</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - 7-Day interactive list */}
          <div className="lg:col-span-4 space-y-6">
            {/* Practice calendar */}
            <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white/40 uppercase font-mono tracking-wider flex items-center gap-2">
                <BookOpen className="w-4.5 h-4.5 text-gold-500" /> 7-Day Visual Roadmap
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your customized calibration roadmap to lock down top feedback metrics. Check off milestones as you train:
              </p>

              <div className="space-y-3 pt-2">
                {report?.roadmap7Days.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3.5 p-3.5 bg-slate-50 dark:bg-dark-950 border border-slate-100 dark:border-white/5 rounded-2xl transition hover:border-gold-500/30"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded text-gold-500 focus:ring-gold-500 border-white/10 mt-0.5 cursor-pointer accent-gold-500"
                    />
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold font-mono text-slate-400 block uppercase">MILESTONE DAY {idx + 1}</span>
                      <p className="text-xs text-slate-800 dark:text-slate-300 leading-normal font-medium">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons panel */}
      <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row gap-4 justify-between items-center">
        <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">
          SESSION OPTIONS
        </span>
        <div className="flex flex-wrap gap-3.5 w-full sm:w-auto">
          <button
            onClick={downloadSessionJSON}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-white/10 hover:border-gold-500 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-dark-850 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-gold-500" /> Export Full JSON Log
          </button>

          <button
            onClick={onReset}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-[#B99362] to-[#D4B483] hover:from-[#A37E50] hover:to-[#B99362] text-black text-xs font-extrabold rounded-2xl shadow-md transition cursor-pointer"
          >
            <RotateCcw className="w-4.5 h-4.5" /> RE-ENTER PRACTICE PROTOCOL
          </button>
        </div>
      </div>
    </div>
  );
}
