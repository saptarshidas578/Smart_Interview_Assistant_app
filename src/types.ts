export enum JobRole {
  SOFTWARE_ENGINEER_INTERN = "Software Engineer Intern",
  FRONTEND_DEVELOPER = "Frontend Developer",
  BACKEND_DEVELOPER = "Backend Developer",
  DATA_ANALYST = "Data Analyst",
  HR_INTERVIEW = "HR Interview"
}

export enum IntervewerPersonality {
  FRIENDLY_HR = "Friendly HR",
  STRICT_TECH_LEAD = "Strict Technical Lead",
  STARTUP_FOUNDER = "Startup Founder",
  CALM_SENIOR_ENGINEER = "Calm Senior Engineer",
  FAST_PACED_RECRUITER = "Fast-paced Recruiter"
}

export enum InterviewMode {
  QUICK_PRACTICE = "Quick Practice",
  FULL_INTERVIEW = "Full Interview",
  BEHAVIORAL = "Behavioral",
  TECHNICAL = "Technical",
  RESUME_BASED = "Resume-based",
  JD_MATCH = "Job Description Match"
}

export enum DifficultyLevel {
  EASY = "Easy",
  MEDIUM = "Medium",
  HARD = "Hard",
  EXPERT = "Expert"
}

export enum SpecialRoundType {
  STANDARD = "Standard Q&A",
  CODE_EXPLANATION = "Code Explanation Round",
  DEBUGGING = "Debugging Interview",
  API_DESIGN = "API Design Round",
  DATABASE_DESIGN = "Database Design Round",
  SQL_SIMULATOR = "SQL Execution Simulator",
  CONFLICT_RESOLUTION = "Conflict Resolution Round",
  ETHICAL_DECISION = "Ethical Decision Round",
  NEGOTIATION = "Negotiation Round"
}

export interface InterviewConfig {
  role: JobRole | string;
  personality: IntervewerPersonality;
  mode: InterviewMode;
  difficulty: DifficultyLevel;
  company: string; // e.g. "Google", "Amazon", "Generic"
  durationMinutes: number;
  questionLimit: number;
  resumeText: string;
  jobDescription: string;
  specialRound?: SpecialRoundType;
}

export interface AnswerEvaluation {
  score: number; // 0-100
  breakdown: {
    relevance: number; // 0-100
    clarity: number; // 0-100
    specificity: number; // 0-100
    structure: number; // 0-100
    technicalDepth: number; // 0-100
    impact: number; // 0-100
  };
  starAnalysis: {
    situation: boolean;
    task: boolean;
    action: boolean;
    result: boolean;
    feedback: string;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  idealAnswerHint: string;
  improvedSampleAnswer: string;
  
  // Advanced reasoning evaluation fields
  contradictionsDetected?: string[];
  factChecks?: string[];
  multiAgentScores?: {
    technicalEvaluator: number;
    hrEvaluator: number;
    communicationCoach: number;
    behavioralPsychologist: number;
    hiringManager: number;
    consensusJustification?: string;
  };
}

export interface SpeechAnalytics {
  wpm: number;
  wordCount: number;
  fillerWordsCount: Record<string, number>;
  confidenceScore: number; // 0-100
  pausesCount: number;
  
  // Advanced Speech Intelligence fields
  sentenceComplexity?: "Simple" | "Compound" | "Complex" | "Highly Academic";
  vocabularyRichness?: "Developing" | "Proficient" | "Rich" | "Expert Professional";
  speakingStyle?: "Analytical" | "Storytelling" | "Direct" | "Verbose" | "Concise";
  energyLevel?: "Monotone" | "Dynamic" | "Enthusiastic" | "Passive";
  breathStress?: "Calm & Stable" | "Controlled Breathing" | "Mild Panic pauses" | "Over-talking stress";
}

export interface AttentionMetrics {
  eyeContactRatio: number; // percentage
  attentionScore: number; // percentage
  headPosture: "Centered" | "Looking Away" | "Looking Down" | "Unknown";
  emotion: "Confident" | "Thoughtful" | "Nervous" | "Neutral" | "Smiling";
  
  // Advanced Video Intelligence / Research fields
  cognitiveLoad?: "Low" | "Medium" | "High" | "Overload";
  curiosityMetric?: "High curiosity & learning mindset" | "Moderate inquisitiveness" | "Passive/Standard attitude";
  backgroundAnalysis?: "Professional Studio" | "Clean Setup" | "Slight Background Noise/Clutter" | "Needs Better Lighting";
  dressCodeEstimate?: "Business Casual" | "Professional Formal" | "Relaxed Casual";
}

export interface InterviewTurn {
  id: string;
  question: string;
  audioUrl?: string; // Optional TTS audio path
  answer: string;
  evaluation?: AnswerEvaluation;
  speechAnalytics?: SpeechAnalytics;
  attentionMetrics?: AttentionMetrics;
  timestamp: string;
  
  // Special rounds interactives
  codeSnippet?: string; // for explanation / debugging
  bugSolution?: string; // expected fix
  dbSchemaJSON?: string; // user table layout
  sqlQuery?: string; // executed query
  sqlOutput?: any[]; // simulation database results
}

export interface HomeworkProblem {
  title: string;
  type: "LeetCode" | "HR behavioral" | "System Design";
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  hint: string;
}

export interface Flashcard {
  id: string;
  topic: string;
  question: string;
  mistakeContext: string;
  correctConcept: string;
}

export interface MCQQuizItem {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  selectedAnswer?: string;
}

export interface FinalReport {
  overallScore: number;
  hireReadiness: "Hire" | "Strong Hire" | "No Hire";
  justification: string;
  communicationFeedback: string;
  technicalFeedback: string;
  strengths: string[];
  weaknesses: string[];
  practicePlan: string;
  roadmap7Days: string[];
  
  // Advanced learning tools
  homework?: HomeworkProblem[];
  flashcards?: Flashcard[];
  quiz?: MCQQuizItem[];
  personalityProfile?: {
    leadership: number;
    teamwork: number;
    ownership: number;
    curiosity: number;
    adaptability: number;
    communicationStyle: string;
  };
  speakingTimeline?: {
    timeRange: string;
    assessment: string;
    note: string;
  }[];
}

export interface InterviewSession {
  id: string;
  userId?: string;
  config: InterviewConfig;
  turns: InterviewTurn[];
  startTime: string;
  endTime?: string;
  status: "idle" | "ongoing" | "completed";
  finalReport?: FinalReport;
}

export interface DailyGoal {
  id: string;
  text: string;
  completed: boolean;
  category: "practice" | "score" | "streak" | "generic";
  targetValue?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  totalScore: number;
  sessionsCount: number;
  streak: number;
  lastActiveDate?: string;
  dailyGoals: DailyGoal[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: "practice" | "score" | "streak" | "goal";
  requirement: string;
  isUnlocked: boolean;
  progressText: string;
  progressPercent: number;
}


