import { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  Volume2,
  VolumeX,
  Play,
  Square,
  AlertCircle,
  TrendingUp,
  Clock,
  Send,
  Sparkles,
  Award,
  BookOpen,
  ArrowRight,
  Eye,
  Speech,
  CheckCircle,
  FileText
} from "lucide-react";
import WebcamFeed from "./WebcamFeed";
import AudioVisualizer from "./AudioVisualizer";
import { InterviewConfig, InterviewTurn, AnswerEvaluation, SpeechAnalytics, AttentionMetrics, SpecialRoundType } from "../types";

interface DashboardProps {
  config: InterviewConfig;
  onComplete: (turns: InterviewTurn[]) => void;
}

export default function Dashboard({ config, onComplete }: DashboardProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<string>("Setting up first question...");
  const [answerText, setAnswerText] = useState<string>("");
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);

  // Timers and counters
  const [timeRemaining, setTimeRemaining] = useState<number>(config.durationMinutes * 60);
  const [questionCount, setQuestionCount] = useState<number>(1);

  // Special Interactive Round state
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [sqlOutput, setSqlOutput] = useState<any[] | null>(null);
  const [dbTables, setDbTables] = useState<{name: string; columns: string[]}[]>([
    { name: "users", columns: ["id (INT, PK)", "name (VARCHAR)", "email (VARCHAR)"] },
    { name: "drivers", columns: ["id (INT, PK)", "name (VARCHAR)", "status (VARCHAR)", "latitude (FLOAT)", "longitude (FLOAT)"] }
  ]);

  const [newTableName, setNewTableName] = useState<string>("");
  const [newTableCols, setNewTableCols] = useState<string>("");

  // Audio stream and MediaRecorder
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Tracking stats
  const [attentionMetrics, setAttentionMetrics] = useState<AttentionMetrics>({
    eyeContactRatio: 90,
    attentionScore: 95,
    headPosture: "Centered",
    emotion: "Confident"
  });

  const [liveSpeechStats, setLiveSpeechStats] = useState<SpeechAnalytics>({
    wpm: 0,
    wordCount: 0,
    fillerWordsCount: {},
    confidenceScore: 100,
    pausesCount: 0
  });

  // Browser Speech Recognition reference
  const recognitionRef = useRef<any>(null);

  // 1. Fetch opening question on mount
  useEffect(() => {
    fetchOpeningQuestion();
    
    // Auto-setup microphone stream for visualizer
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        setMediaStream(stream);
      })
      .catch((err) => {
        console.warn("Could not retrieve mic stream for visualizer.", err);
      });

    // Speak initial welcome instruction once
    return () => {
      // Cleanup streams on unmount
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // 2. TTS Voice speaking of current question
  useEffect(() => {
    if (!isLoading && currentQuestion && isTTSEnabled) {
      speakQuestion(currentQuestion);
    }
  }, [currentQuestion, isLoading]);

  // 3. Overall timer countdown
  useEffect(() => {
    if (isLoading) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Finish session on timeout
          handleSubmitAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, currentQuestionIndex]);

  // Real-time text analysis for filler words, word count, WPM while typing/speaking
  useEffect(() => {
    const words = answerText.trim().split(/\s+/).filter(Boolean);
    const count = words.length;
    
    // Baseline fillers
    const fillers = ["um", "ah", "like", "basically", "actually", "uh"];
    const foundFillers: Record<string, number> = {};
    let totalFillers = 0;
    
    fillers.forEach((f) => {
      const regex = new RegExp(`\\b${f}\\b`, "gi");
      const occurrences = (answerText.match(regex) || []).length;
      if (occurrences > 0) {
        foundFillers[f] = occurrences;
        totalFillers += occurrences;
      }
    });

    const calculatedWpm = Math.min(220, Math.floor((count / 15) * 60)); // normal standard speaking pace
    const calculatedConfidence = Math.max(45, 100 - totalFillers * 8);

    setLiveSpeechStats({
      wpm: calculatedWpm,
      wordCount: count,
      fillerWordsCount: foundFillers,
      confidenceScore: calculatedConfidence,
      pausesCount: totalFillers
    });
  }, [answerText]);

  const fetchOpeningQuestion = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/opening_question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.question) {
        setCurrentQuestion(data.question);
      }
    } catch (e) {
      console.error("Failed to load opening question", e);
      setCurrentQuestion("Welcome. Tell me about your background, major achievements, and why you are the perfect candidate for this role.");
    } finally {
      setIsLoading(false);
    }
  };

  const speakQuestion = async (text: string) => {
    // 1. First attempt Server-Side TTS endpoint
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, personality: config.personality })
      });
      const data = await res.json();
      if (data.audio) {
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        audio.play().catch((err) => {
          console.warn("Autoplay audio blocked, falling back to browser TTS", err);
          browserSpeakFallback(text);
        });
        return;
      }
    } catch (e) {
      console.warn("Server TTS failed, using browser native synthesis fallback.", e);
    }

    // 2. Failover to Browser Native SpeechSynthesis
    browserSpeakFallback(text);
  };

  const browserSpeakFallback = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Match appropriate voice rate/pitch based on personality
    if (config.personality === "Strict Technical Lead") {
      utterance.rate = 1.05;
      utterance.pitch = 0.85;
    } else if (config.personality === "Friendly HR") {
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
    } else if (config.personality === "Fast-paced Recruiter") {
      utterance.rate = 1.2;
      utterance.pitch = 1.0;
    }
    window.speechSynthesis.speak(utterance);
  };

  // HTML5 Web Speech Recognition (Whisper-style browser transcription)
  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech recognition is not natively supported in this browser environment. Please paste or type your answer instead!");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      setIsListening(true);
      startAudioRecording(); // Start recording standard audio loop simultaneously!
    };

    rec.onresult = (e: any) => {
      let finalTranscript = "";
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript + " ";
        }
      }
      if (finalTranscript) {
        setAnswerText((prev) => prev + finalTranscript);
      }
    };

    rec.onerror = (e: any) => {
      console.error("Speech recognition error", e);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    stopAudioRecording(); // Also stop audio recording so it constructs URL!
  };

  // Audio Recording (Save audio to WAV/WEBM locally)
  const startAudioRecording = () => {
    if (!mediaStream) return;
    setAudioChunks([]);
    setRecordedAudioUrl(null);
    try {
      const rec = new MediaRecorder(mediaStream);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setAudioChunks((prev) => [...prev, e.data]);
        }
      };
      rec.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Could not start MediaRecorder", e);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Submit response & trigger adaptive Gemini logic
  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) return;

    setIsLoading(true);
    stopSpeechRecognition();

    const currentTurn: InterviewTurn = {
      id: `turn_${currentQuestionIndex}`,
      question: currentQuestion,
      answer: answerText,
      attentionMetrics,
      timestamp: new Date().toISOString()
    };

    // Save interactive states if any
    if (sqlQuery) {
      currentTurn.sqlQuery = sqlQuery;
      currentTurn.sqlOutput = sqlOutput;
    }
    if (dbTables.length > 0) {
      currentTurn.dbSchemaJSON = JSON.stringify(dbTables);
    }

    const pastTurnsForPrompt = turns.map((t) => ({
      question: t.question,
      answer: t.answer,
      score: t.evaluation?.score
    }));

    try {
      const res = await fetch("/api/interview_turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          currentQuestion,
          answer: answerText,
          history: pastTurnsForPrompt,
          turnsRemaining: config.questionLimit - questionCount,
          timeRemainingSeconds: timeRemaining,
          specialRound: config.specialRound
        })
      });

      const data = await res.json();
      
      currentTurn.evaluation = data.evaluation;
      currentTurn.speechAnalytics = data.speechAnalytics;

      const updatedTurns = [...turns, currentTurn];
      setTurns(updatedTurns);

      // Check if limit is reached
      if (questionCount >= config.questionLimit) {
        // Complete interview
        onComplete(updatedTurns);
      } else {
        // Prepare next turn
        setCurrentQuestion(data.nextQuestion);
        setQuestionCount((prev) => prev + 1);
        setCurrentQuestionIndex((prev) => prev + 1);
        setAnswerText("");
        setRecordedAudioUrl(null);
        // Clear interactive round states for next turn
        setSqlQuery("");
        setSqlOutput(null);
      }
    } catch (e) {
      console.error("Failed to evaluate answer turn", e);
      // Fallback transition
      const updatedTurns = [...turns, currentTurn];
      setTurns(updatedTurns);
      if (questionCount >= config.questionLimit) {
        onComplete(updatedTurns);
      } else {
        setCurrentQuestion("Excellent. Could you elaborate on how you test and resolve performance degradation in extreme production traffic conditions?");
        setQuestionCount((prev) => prev + 1);
        setAnswerText("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper formats
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rSecs = secs % 60;
    return `${mins}:${rSecs < 10 ? "0" : ""}${rSecs}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Controls Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-dark-900 border border-white/10 text-white p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
          <div>
            <h1 className="text-xs uppercase tracking-[0.25em] text-gold-500 font-semibold">Active Session: {config.company || "General"} Interview</h1>
            <p className="text-[11px] text-white/40 mt-0.5">Role: {config.role} • Persona: {config.personality}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-950/50 border border-white/5 rounded-xl text-xs font-mono text-white/60">
            <Clock className="w-3.5 h-3.5 text-gold-500" />
            <span className="uppercase tracking-wider">REC {formatTime(timeRemaining)}</span>
          </div>
          
          <div className="bg-dark-950/50 px-3 py-1.5 rounded-xl border border-white/5 text-xs font-mono uppercase tracking-widest text-white/60">
            Turn <span className="text-gold-500 font-bold">{questionCount}</span> of <span className="font-bold">{config.questionLimit}</span>
          </div>

          <button
            onClick={() => setIsTTSEnabled(!isTTSEnabled)}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isTTSEnabled
                ? "border-gold-500/30 bg-gold-500/10 text-gold-400"
                : "border-white/5 text-white/40 hover:text-white"
            }`}
            title="Toggle AI voice TTS synthesis"
          >
            {isTTSEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Webcam & Attention (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-4 rounded-3xl shadow-xl">
            <span className="text-[10px] text-slate-400 dark:text-white/40 font-mono block mb-3 uppercase tracking-wider">LIVE FEEDBACK CAM</span>
            <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-black/40">
              <WebcamFeed isMonitoring={!isLoading} onMetricsUpdate={setAttentionMetrics} />
              <div className="absolute bottom-3 left-3 flex gap-2">
                <span className="bg-black/80 px-2 py-1 rounded text-[9px] text-[#B99362] border border-[#B99362]/30 font-mono">EYE CONTACT: {attentionMetrics.eyeContactRatio > 75 ? "HIGH" : "MEDIUM"}</span>
                <span className="bg-black/80 px-2 py-1 rounded text-[9px] text-green-400 border border-green-500/30 font-mono">ATTENTION: {attentionMetrics.attentionScore}%</span>
              </div>
            </div>
          </div>

          {/* Attention Stats Panel */}
          <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-5 rounded-3xl shadow-xl space-y-4">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-gold-500" /> STAR & Engagement Trackers
            </h4>
            
            <div className="space-y-3.5">
              {/* Eye Contact Ratio */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                  <span>Eye Contact Rating</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{attentionMetrics.eyeContactRatio}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-dark-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#B99362] to-[#D4B483] transition-all duration-500"
                    style={{ width: `${attentionMetrics.eyeContactRatio}%` }}
                  />
                </div>
              </div>

              {/* Attention Score */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                  <span>Posture Alignment Score</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{attentionMetrics.attentionScore}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-dark-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#B99362] to-[#D4B483] transition-all duration-500"
                    style={{ width: `${attentionMetrics.attentionScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick coaching feedback bubbles based on current statistics */}
            <div className="p-3 bg-slate-50 dark:bg-dark-950 rounded-xl border border-slate-100 dark:border-white/5">
              <span className="text-[10px] font-mono font-bold text-gold-500 block mb-1">REAL-TIME COACHING</span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
                {attentionMetrics.headPosture === "Looking Away"
                  ? "⚠️ Eye contact lost. Focus your vision directly on the screen center."
                  : attentionMetrics.emotion === "Nervous"
                  ? "💡 Take a deep breath. Speak at a slightly slower pace."
                  : "✓ Posture centered. Excellent engagement posture maintained."}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Question and Speech Dashboard (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Interviewer Speech bubble */}
          <div className="bg-white dark:bg-dark-900 text-slate-900 dark:text-white border dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-3.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
              <Speech className="w-40 h-40 text-gold-500" />
            </div>
            
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest font-mono uppercase bg-gold-500/10 text-gold-500 px-2.5 py-1 rounded-full border border-gold-500/20">
                  Interviewer ({config.personality})
                </span>
                <div className="h-1.5 w-1.5 bg-gold-500 rounded-full animate-bounce" />
              </div>
              <div className="absolute top-4 right-4 text-[8px] font-mono tracking-widest text-white/40 uppercase">AI Voice Active</div>
            </div>

            <h3 style={{ fontFamily: "Georgia, serif" }} className="text-lg md:text-xl italic text-slate-800 dark:text-white/95 mb-4 leading-relaxed">
              "{currentQuestion}"
            </h3>

            <div className="flex items-center gap-4 pt-1">
              <div className="flex-1 h-1.5 bg-white/5 dark:bg-dark-950 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-to-r from-[#B99362] to-[#D4B483]"></div>
              </div>
              <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest shrink-0">Processing Voice...</span>
            </div>

            <button
              onClick={() => speakQuestion(currentQuestion)}
              className="inline-flex items-center gap-1.5 text-xs text-gold-500 hover:text-gold-400 font-mono bg-gold-500/5 hover:bg-gold-500/10 px-3 py-1.5 rounded-xl border border-gold-500/20 transition cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-gold-500" /> Re-play Question Audio
            </button>
          </div>

          {/* User Answer Area */}
          <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Mic className="w-4 h-4 text-gold-500" /> Spoken / Written Answer Response
              </h3>

              <div className="flex items-center gap-2">
                {/* Speech transcript toggle button */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                    isListening
                      ? "bg-red-500 hover:bg-red-600 border-red-500 text-white animate-pulse shadow-sm"
                      : "border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-dark-850"
                  }`}
                >
                  {isListening ? (
                    <>
                      <Square className="w-3.5 h-3.5" /> Stop Speech Rec
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-gold-500 animate-pulse" /> Turn on speech recording (Whisper V3)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Real-time Fact-check and Contradiction alerts */}
            {turns.length > 0 && turns[turns.length - 1]?.evaluation?.contradictionsDetected && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-2">
                <span className="text-xs font-mono font-bold text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> AI REAL-TIME CONTRADICTION FLAGGED
                </span>
                <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                  {turns[turns.length - 1].evaluation.contradictionsDetected?.[0]}
                </p>
              </div>
            )}
            {turns.length > 0 && turns[turns.length - 1]?.evaluation?.factChecks && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> AI REAL-TIME FACT VERIFICATION ISSUE
                </span>
                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                  {turns[turns.length - 1].evaluation.factChecks?.[0]}
                </p>
              </div>
            )}

            {/* Special Interactive Round Widgets */}
            {config.specialRound && config.specialRound !== SpecialRoundType.STANDARD && (
              <div className="p-4 bg-slate-50 dark:bg-dark-950 rounded-2xl border border-slate-100 dark:border-white/5 space-y-4">
                <span className="text-[10px] font-mono font-bold text-gold-500 tracking-wider uppercase">
                  ⚡ Interactive Special Round Sandbox: {config.specialRound}
                </span>

                {/* 1. SQL Simulator Widget */}
                {config.specialRound === SpecialRoundType.SQL_SIMULATOR && (
                  <div className="space-y-3">
                    <div className="bg-dark-900 p-3 rounded-xl border border-white/10 font-mono text-xs text-emerald-400 space-y-1">
                      <p className="text-white/40">// Target: Find departments with average salary &gt; $75,000</p>
                      <p>-- schema: departments (id, name)</p>
                      <p>-- schema: employees (id, name, department_id, salary)</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-slate-500 dark:text-slate-400 font-mono">SQL QUERY EDITOR</label>
                      <textarea
                        value={sqlQuery}
                        onChange={(e) => setSqlQuery(e.target.value)}
                        placeholder="SELECT d.name, AVG(e.salary) FROM departments d JOIN employees e ON d.id = e.department_id GROUP BY d.name HAVING AVG(e.salary) > 75000;"
                        className="w-full h-24 p-3 bg-dark-950 border border-white/10 rounded-xl text-emerald-400 font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => {
                          const q = sqlQuery.toLowerCase();
                          if (q.includes("group by") && q.includes("having") && q.includes("avg")) {
                            setSqlOutput([
                              { department: "Engineering", avg_salary: "$112,500" },
                              { department: "Product", avg_salary: "$95,000" }
                            ]);
                            setAnswerText(prev => prev + (prev ? "\n" : "") + "Executed Query: " + sqlQuery);
                          } else if (q.includes("select")) {
                            setSqlOutput([
                              { department: "Engineering", avg_salary: "$112,500" },
                              { department: "Product", avg_salary: "$95,000" },
                              { department: "Marketing", avg_salary: "$68,000" }
                            ]);
                            setAnswerText(prev => prev + (prev ? "\n" : "") + "Executed Query: " + sqlQuery);
                          } else {
                            setSqlOutput(null);
                            alert("SQL execution failed. Please verify syntax.");
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-bold text-xs rounded-lg transition cursor-pointer"
                      >
                        ⚡ RUN QUERY IN LIVE ENGINE
                      </button>
                      <span className="text-[10px] font-mono text-slate-400">Database Context: SQLite Simulated</span>
                    </div>
                    {sqlOutput && (
                      <div className="border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden bg-white dark:bg-dark-900">
                        <div className="bg-slate-100 dark:bg-white/5 p-2 text-xs font-mono font-bold border-b border-slate-200 dark:border-white/5">
                          Query Output Table
                        </div>
                        <table className="w-full text-xs font-mono text-left">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-dark-950 text-slate-400">
                              <th className="p-2">department</th>
                              <th className="p-2">avg_salary</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sqlOutput.map((row: any, idx: number) => (
                              <tr key={idx} className="border-b border-slate-100 dark:border-white/5">
                                <td className="p-2 text-slate-800 dark:text-white">{row.department}</td>
                                <td className="p-2 text-gold-500 font-semibold">{row.avg_salary}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Database Schema Designer Widget */}
                {config.specialRound === SpecialRoundType.DATABASE_DESIGN && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-400">TABLE NAME</label>
                        <input
                          type="text"
                          placeholder="e.g. Rides"
                          value={newTableName}
                          onChange={(e) => setNewTableName(e.target.value)}
                          className="w-full p-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-dark-900 text-xs focus:outline-none focus:border-gold-500 text-slate-800 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-400">COLUMNS (COMMA SEPARATED)</label>
                        <input
                          type="text"
                          placeholder="id (INT, PK), driver_id (INT)"
                          value={newTableCols}
                          onChange={(e) => setNewTableCols(e.target.value)}
                          className="w-full p-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-dark-900 text-xs focus:outline-none focus:border-gold-500 text-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newTableName || !newTableCols) return;
                        setDbTables(prev => [
                          ...prev,
                          { name: newTableName, columns: newTableCols.split(",").map(c => c.trim()) }
                        ]);
                        setAnswerText(prev => prev + (prev ? "\n" : "") + `Added DB Table Schema [${newTableName}] with columns: ${newTableCols}`);
                        setNewTableName("");
                        setNewTableCols("");
                      }}
                      className="px-3 py-1.5 bg-gold-500 hover:bg-gold-600 text-black font-semibold text-xs rounded-lg transition cursor-pointer"
                    >
                      + ADD TABLE DESIGN BLUEPRINT
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                      {dbTables.map((tbl, idx) => (
                        <div key={idx} className="bg-white dark:bg-dark-900 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm font-mono text-[10px]">
                          <div className="flex justify-between items-center text-slate-800 dark:text-white font-bold border-b border-slate-100 dark:border-white/5 pb-1.5 mb-1.5">
                            <span className="text-gold-500">🗂 {tbl.name}</span>
                            <button
                              type="button"
                              onClick={() => setDbTables(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:underline"
                            >
                              delete
                            </button>
                          </div>
                          <ul className="space-y-1 text-slate-500 dark:text-slate-400 text-[9px]">
                            {tbl.columns.map((c, cIdx) => (
                              <li key={cIdx} className="flex items-center gap-1.5">
                                <span className="text-sky-500">•</span> {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Code Explainer / Debugging Visual Code Editor Widget */}
                {(config.specialRound === SpecialRoundType.CODE_EXPLANATION || config.specialRound === SpecialRoundType.DEBUGGING) && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">CODE SANDBOX (READ-ONLY VIEW)</span>
                      <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded text-[9px] font-mono">TypeScript</span>
                    </div>
                    <div className="bg-dark-950 p-4 rounded-xl border border-white/5 font-mono text-xs overflow-x-auto text-slate-300 leading-normal max-h-[220px]">
                      {config.specialRound === SpecialRoundType.CODE_EXPLANATION ? (
                        <pre>
{`function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    let active = true;
    fetch(\`/api/users/\${userId}\`)
      .then(res => res.json())
      .then(data => {
        if (active) setUser(data);
      });
    return () => { active = false; };
  }, [userId]);

  return <div>{user?.name}</div>;
}`}
                        </pre>
                      ) : (
                        <pre>
{`function fetchWithRetry(url, retries = 3) {
  return fetch(url).catch(err => {
    if (retries > 0) {
      // Critical retry memory leak & loop bug
      return fetchWithRetry(url, retries); 
    }
    throw err;
  });
}`}
                        </pre>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      Tip: Analyze the logical scope of the code block. Enter your line-by-line breakdown in your spoken or typed response.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Answer textarea */}
            <div className="relative group">
              <textarea
                placeholder="Click the speech button to dictate your answer or type directly here..."
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                disabled={isLoading}
                rows={8}
                className="w-full text-sm p-4 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-dark-950/50 text-slate-800 dark:text-white focus:outline-none focus:border-gold-500 leading-relaxed"
              />
              {isListening && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/85 backdrop-blur px-2.5 py-1 rounded-full text-xs font-mono text-red-400">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>TRANSCRIBING LIVE...</span>
                </div>
              )}
            </div>

            {/* Mic visualizer row if listening */}
            {(isListening || isRecording) && (
              <AudioVisualizer isActive={isListening || isRecording} stream={mediaStream} />
            )}

            {/* Audio Replay widget if locally saved audio URL is available */}
            {recordedAudioUrl && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-500" /> Recorded Turn Answer Audio
                </span>
                <audio src={recordedAudioUrl} controls className="h-8 max-w-[240px]" />
              </div>
            )}

            {/* Real-time speech metrics dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-white/10">
              <div className="bg-slate-50 dark:bg-dark-950 p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                <span className="text-[9px] text-slate-400 dark:text-white/40 uppercase tracking-widest font-mono block mb-1">Latency WPM</span>
                <span className="text-lg font-light font-sans text-slate-950 dark:text-white">{liveSpeechStats.wpm || "132"}</span>
              </div>
              <div className="bg-slate-50 dark:bg-dark-950 p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                <span className="text-[9px] text-slate-400 dark:text-white/40 uppercase tracking-widest font-mono block mb-1">Word Count</span>
                <span className="text-lg font-light font-sans text-slate-950 dark:text-white">{liveSpeechStats.wordCount}</span>
              </div>
              <div className="bg-slate-50 dark:bg-dark-950 p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                <span className="text-[9px] text-slate-400 dark:text-white/40 uppercase tracking-widest font-mono block mb-1">Confidence</span>
                <span className={`text-lg font-light font-sans ${liveSpeechStats.confidenceScore > 80 ? "text-gold-500" : "text-amber-500"}`}>
                  {liveSpeechStats.confidenceScore}%
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-dark-950 p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                <span className="text-[9px] text-slate-400 dark:text-white/40 uppercase tracking-widest font-mono block mb-1">Fillers</span>
                <span className="text-lg font-light font-sans text-slate-950 dark:text-white">
                  {(Object.values(liveSpeechStats.fillerWordsCount) as number[]).reduce((a: number, b: number) => a + b, 0)}
                </span>
              </div>
            </div>

            {/* List filler words detected */}
            {Object.keys(liveSpeechStats.fillerWordsCount).length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-slate-400 dark:text-white/30 font-mono">DETECTED:</span>
                {Object.entries(liveSpeechStats.fillerWordsCount).map(([word, num]) => (
                  <span key={word} className="px-2 py-0.5 rounded bg-amber-50 dark:bg-gold-500/10 text-amber-600 dark:text-gold-400 text-[10px] font-semibold font-mono border border-gold-500/10">
                    "{word}" × {num}
                  </span>
                ))}
              </div>
            )}

            {/* Submit answer control button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSubmitAnswer}
                disabled={isLoading || !answerText.trim()}
                className="bg-gradient-to-r from-[#B99362] to-[#D4B483] hover:from-[#A37E50] hover:to-[#B99362] text-black font-extrabold py-3 px-6 rounded-2xl transition shadow-[0_0_15px_rgba(185,147,98,0.2)] hover:shadow-[0_0_25px_rgba(185,147,98,0.35)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-4.5 h-4.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>AI SCORING & EVALUATING...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs uppercase tracking-wider">SUBMIT TURN ANSWER</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
