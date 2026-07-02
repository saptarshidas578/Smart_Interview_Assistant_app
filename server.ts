import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Ensure Gemini Client is initialized lazy or guarded
let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Using mock mode for interview sessions.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper to determine if we are in mock mode
const isMockMode = () => !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY";

// 1. Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mode: isMockMode() ? "mock" : "live",
    timestamp: new Date().toISOString()
  });
});

// 2. Generate Opening Question
app.post("/api/opening_question", async (req, res) => {
  const { role, personality, mode, difficulty, company, resumeText, jobDescription } = req.body;

  if (isMockMode()) {
    // Generate an elegant response for mock mode if API key is not yet set up
    const mockQuestions: Record<string, string> = {
      "Software Engineer Intern": `Welcome to the interview! I'm your interviewer today with a ${personality} personality. To kick off, since this is an internship role, could you tell me about a specific programming project you built recently, what challenges you faced, and how you solved them?`,
      "Frontend Developer": `Glad to have you here. Looking at your interest in Frontend Development, how would you approach building a highly performant, accessible data table component that supports sorting, filtering, and lazy loading in React?`,
      "Backend Developer": `Welcome. Let's jump straight in. How do you design and scale a backend database schema for a high-traffic e-commerce order checkout system to avoid race conditions and double-spending?`,
      "Data Analyst": `Hello. I'd love to understand your analytical approach. Suppose you see a sudden 15% drop in user engagement on our platform over the weekend. What is your step-by-step methodology to diagnose and isolate the root cause?`,
      "HR Interview": `Thanks for taking the time to speak with me today. Tell me about a time when you had a serious conflict with a team member or stakeholder. What was the situation, and how did you resolve it to ensure a successful outcome?`
    };

    const q = mockQuestions[role] || `Welcome. Tell me about your interest in this role and why you're a strong fit for our engineering team at ${company || "our firm"}.`;
    return res.json({ question: q });
  }

  try {
    const ai = getAI();
    const systemPrompt = `You are an expert AI Job Interviewer simulating a realistic, interactive interview.
Your role: ${role}
Your personality: ${personality}
Interview Mode: ${mode}
Difficulty Level: ${difficulty}
Target Company: ${company || "General Tech Firm"}

Resume context:
${resumeText || "No resume provided."}

Job Description context:
${jobDescription || "No job description provided."}

Generate the absolute first opening question of the interview. 
Avoid generic questions like "Tell me about yourself" if a resume or Job Description is provided. Instead, generate a highly contextual, personalized, and deep first question that sets the tone for a ${difficulty} difficulty session. Maintain your designated personality (${personality}) in your tone (e.g., if Strict Tech Lead, be demanding and highly technical; if Friendly HR, be warm and welcoming but professional; if Startup Founder, focus on growth, hustle, and speed).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: systemPrompt,
      config: {
        temperature: 0.7,
      }
    });

    const questionText = response.text || "Welcome to the interview. Please describe your background and why you are the perfect candidate for this role.";
    res.json({ question: questionText });
  } catch (error: any) {
    console.error("Error generating opening question:", error);
    res.status(500).json({ error: error.message || "Failed to generate opening question." });
  }
});

// 3. Process Interview Turn (Evaluation + Next Question Adaptive Flow)
app.post("/api/interview_turn", async (req, res) => {
  const {
    role,
    personality,
    mode,
    difficulty,
    company,
    resumeText,
    jobDescription,
    currentQuestion,
    answer,
    history, // array of { question: string, answer: string, score: number }
    turnsRemaining,
    timeRemainingSeconds
  } = req.body;

  if (isMockMode()) {
    // Generate a beautiful, realistic mock evaluation
    const score = Math.floor(Math.random() * 20) + 75; // 75 - 95
    // Simple contradiction & fact checking triggers for high fidelity mock mode
    const lowerAnswer = answer.toLowerCase();
    const historyText = history ? JSON.stringify(history) : "";
    const contradictionsDetected: string[] = [];
    const factChecks: string[] = [];

    if (lowerAnswer.includes("alone") && historyText.toLowerCase().includes("team")) {
      contradictionsDetected.push("Candidate initially stated they led a cross-functional team of 6 engineers, but subsequently described their operational execution as a fully isolated standalone contributor.");
    } else if (lowerAnswer.includes("quick") && lowerAnswer.includes("perfect") && Math.random() > 0.7) {
      contradictionsDetected.push("Conflict between rapid MVP delivery methodology and prior claims of rigorous 100% test-driven absolute code safety.");
    }

    if (lowerAnswer.includes("jquery") && lowerAnswer.includes("virtual dom")) {
      factChecks.push("Fact Check Alert: jQuery operates directly on the browser's live DOM Tree; it does not utilize a virtual DOM diffing engine as described.");
    } else if (lowerAnswer.includes("redux") && lowerAnswer.includes("localstorage") && lowerAnswer.includes("fast")) {
      factChecks.push("Note: Redux is an in-memory state container. Serializing the entire redux tree to localStorage on every state tick incurs substantial synchronous write penalties.");
    }

    const evaluation = {
      score,
      breakdown: {
        relevance: Math.floor(Math.random() * 15) + 80,
        clarity: Math.floor(Math.random() * 15) + 80,
        specificity: Math.floor(Math.random() * 20) + 75,
        structure: Math.floor(Math.random() * 15) + 80,
        technicalDepth: Math.floor(Math.random() * 25) + 70,
        impact: Math.floor(Math.random() * 20) + 75,
      },
      starAnalysis: {
        situation: answer.toLowerCase().includes("situation") || answer.length > 100,
        task: answer.toLowerCase().includes("task") || answer.length > 120,
        action: answer.toLowerCase().includes("action") || answer.toLowerCase().includes("implemented") || answer.length > 150,
        result: answer.toLowerCase().includes("result") || answer.toLowerCase().includes("metric") || answer.length > 180,
        feedback: "The response was structured quite well, showing some aspects of the STAR framework, though quantifying your direct results would make it even stronger."
      },
      strengths: ["Clear communication flow", "Good explanation of core tools used", "Logical sequencing of events"],
      weaknesses: ["Could emphasize your personal impact more", "Specific metrics are slightly missing", "Could dive deeper into alternative system designs"],
      suggestions: ["Use the STAR method explicitly: state the situation, explain your exact task, detail the specific action you took, and state the quantifiable result (e.g. 20% speedup).", "Mention alternative tools you considered and why you selected this approach."],
      idealAnswerHint: "An ideal response would detail a specific project where you designed the solution, used metrics (e.g., 'reduced API response times from 500ms to 80ms by introducing Redis caching'), and clearly separated your work from the team's.",
      improvedSampleAnswer: `Certainly! In my last role as a developer, we noticed our main dashboard took over 3 seconds to render because it queried several heavy database endpoints. I took the initiative to set up an Express proxy server with local Redis storage. I identified the 3 most frequent queries, set a 10-minute cache eviction policy, and built a pre-fetching hook in React. As a direct result, average loading latency dropped by 85% to just 450ms, resulting in a noticeable improvement in user satisfaction.`,
      contradictionsDetected: contradictionsDetected.length > 0 ? contradictionsDetected : undefined,
      factChecks: factChecks.length > 0 ? factChecks : undefined,
      multiAgentScores: {
        technicalEvaluator: Math.min(100, score + Math.floor(Math.random() * 6) - 3),
        hrEvaluator: Math.min(100, score + Math.floor(Math.random() * 8) - 4),
        communicationCoach: Math.min(100, score + Math.floor(Math.random() * 10) - 5),
        behavioralPsychologist: Math.min(100, score + Math.floor(Math.random() * 6) - 3),
        hiringManager: Math.min(100, score + Math.floor(Math.random() * 4) - 2),
        consensusJustification: "The evaluation committee agrees that the candidate demonstrates high operational readiness and structured alignment, with minor points of clarification regarding execution metrics."
      }
    };

    // Determine mock next question
    let nextQuestion = `That's an interesting response. Let's follow up on that. Could you explain how you would handle failure states, cache invalidation, or recovery policies in the system architecture you just described?`;
    if (turnsRemaining <= 1) {
      nextQuestion = `Thank you for those insights. As our final question, what is your long-term career goal and how do you believe this role at ${company || "our company"} matches your professional trajectory?`;
    }

    // Fake Speech analytics
    const words = answer.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const wpm = Math.floor((wordCount / 30) * 60); // Assuming 30s speak time
    const fillers = ["um", "ah", "like", "basically", "actually"];
    const fillerWordsCount: Record<string, number> = {};
    fillers.forEach(f => {
      const count = (answer.toLowerCase().match(new RegExp(`\\b${f}\\b`, 'g')) || []).length;
      if (count > 0) fillerWordsCount[f] = count;
    });

    const speechAnalytics = {
      wpm: wpm || 130,
      wordCount: wordCount || 50,
      fillerWordsCount,
      confidenceScore: Math.floor(Math.random() * 15) + 80,
      pausesCount: Math.floor(Math.random() * 4) + 1
    };

    return res.json({
      evaluation,
      nextQuestion,
      speechAnalytics
    });
  }

  try {
    const ai = getAI();
    
    // Construct structured prompting context
    const historyText = history && history.length > 0
      ? history.map((h: any, i: number) => `Q${i+1}: ${h.question}\nA${i+1}: ${h.answer}\nScore: ${h.score || 'N/A'}`).join("\n\n")
      : "No previous questions/answers yet.";

    const systemPrompt = `You are an elite, adaptive Job Interviewer and Technical Evaluator.
Role: ${role}
Interviewer Personality: ${personality}
Interview Mode: ${mode}
Difficulty: ${difficulty}
Target Company: ${company}

CANDIDATE RECENT RESPONSE SUMMARY:
Question Asked: ${currentQuestion}
Answer Submitted: "${answer}"

INTERVIEW CONTEXT & PROGRESS:
Remaining Turns: ${turnsRemaining}
Time Left in Interview: ${timeRemainingSeconds} seconds
History of past exchanges:
${historyText}

YOUR TASK:
1. Evaluate the candidate's last answer in high detail. Return an overall score (0-100) and criteria scores (0-100 for Relevance, Clarity, Specificity, Structure, Technical Depth, Impact).
2. Perform a STAR (Situation, Task, Action, Result) Analysis. Check if each component is present in their answer.
3. Generate detailed feedback (strengths, weaknesses, suggestions, ideal answer hint, and an improved sample answer).
4. GENERATE THE NEXT QUESTION adaptively:
   - If their answer was weak (score < 70), ask a follow-up or clarifying question to give them a second chance to explain.
   - If their answer was strong (score >= 70), challenge them! Deep-dive into something they said (e.g. if they mentioned Redis, cross-question them on eviction policies or failure modes).
   - If turnsRemaining is 1 or time is very low, ask a closing question styled appropriately for your personality.
   - Ensure the tone matches your personality: ${personality}.

You MUST return the output strictly formatted as JSON according to the following schema:
{
  "evaluation": {
    "score": number, // 0-100
    "breakdown": {
      "relevance": number, // 0-100
      "clarity": number, // 0-100
      "specificity": number, // 0-100
      "structure": number, // 0-100
      "technicalDepth": number, // 0-100
      "impact": number // 0-100
    },
    "starAnalysis": {
      "situation": boolean,
      "task": boolean,
      "action": boolean,
      "result": boolean,
      "feedback": string
    },
    "strengths": string[],
    "weaknesses": string[],
    "suggestions": string[],
    "idealAnswerHint": string,
    "improvedSampleAnswer": string,
    "contradictionsDetected": string[], // Any factual contradictions with history or prior statements. If none, keep empty.
    "factChecks": string[], // Any technical inaccuracies or logical fallacies. If none, keep empty.
    "multiAgentScores": {
      "technicalEvaluator": number, // 0-100
      "hrEvaluator": number, // 0-100
      "communicationCoach": number, // 0-100
      "behavioralPsychologist": number, // 0-100
      "hiringManager": number, // 0-100
      "consensusJustification": string
    }
  },
  "nextQuestion": string
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["evaluation", "nextQuestion"],
          properties: {
            evaluation: {
              type: Type.OBJECT,
              required: [
                "score", 
                "breakdown", 
                "starAnalysis", 
                "strengths", 
                "weaknesses", 
                "suggestions", 
                "idealAnswerHint", 
                "improvedSampleAnswer",
                "multiAgentScores"
              ],
              properties: {
                score: { type: Type.INTEGER },
                breakdown: {
                  type: Type.OBJECT,
                  required: ["relevance", "clarity", "specificity", "structure", "technicalDepth", "impact"],
                  properties: {
                    relevance: { type: Type.INTEGER },
                    clarity: { type: Type.INTEGER },
                    specificity: { type: Type.INTEGER },
                    structure: { type: Type.INTEGER },
                    technicalDepth: { type: Type.INTEGER },
                    impact: { type: Type.INTEGER },
                  }
                },
                starAnalysis: {
                  type: Type.OBJECT,
                  required: ["situation", "task", "action", "result", "feedback"],
                  properties: {
                    situation: { type: Type.BOOLEAN },
                    task: { type: Type.BOOLEAN },
                    action: { type: Type.BOOLEAN },
                    result: { type: Type.BOOLEAN },
                    feedback: { type: Type.STRING },
                  }
                },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                idealAnswerHint: { type: Type.STRING },
                improvedSampleAnswer: { type: Type.STRING },
                contradictionsDetected: { type: Type.ARRAY, items: { type: Type.STRING } },
                factChecks: { type: Type.ARRAY, items: { type: Type.STRING } },
                multiAgentScores: {
                  type: Type.OBJECT,
                  required: [
                    "technicalEvaluator",
                    "hrEvaluator",
                    "communicationCoach",
                    "behavioralPsychologist",
                    "hiringManager",
                    "consensusJustification"
                  ],
                  properties: {
                    technicalEvaluator: { type: Type.INTEGER },
                    hrEvaluator: { type: Type.INTEGER },
                    communicationCoach: { type: Type.INTEGER },
                    behavioralPsychologist: { type: Type.INTEGER },
                    hiringManager: { type: Type.INTEGER },
                    consensusJustification: { type: Type.STRING }
                  }
                }
              }
            },
            nextQuestion: { type: Type.STRING }
          }
        }
      }
    });

    const result = JSON.parse(response.text.trim());

    // Calculate dynamic speech metrics on server if client sends duration/audio data
    const words = answer.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const wpm = Math.floor((wordCount / 30) * 60); // baseline
    const fillers = ["um", "ah", "like", "basically", "actually", "uh"];
    const fillerWordsCount: Record<string, number> = {};
    fillers.forEach(f => {
      const count = (answer.toLowerCase().match(new RegExp(`\\b${f}\\b`, 'g')) || []).length;
      if (count > 0) fillerWordsCount[f] = count;
    });

    result.speechAnalytics = {
      wpm: wpm || 135,
      wordCount,
      fillerWordsCount,
      confidenceScore: Math.min(100, Math.max(50, 95 - (Object.keys(fillerWordsCount).length * 5))),
      pausesCount: Math.floor(Math.random() * 3) + 1
    };

    res.json(result);
  } catch (error: any) {
    console.error("Error evaluating interview turn:", error);
    res.status(500).json({ error: error.message || "Failed to process interview turn." });
  }
});

// 4. Generate Final Performance Report
app.post("/api/final_report", async (req, res) => {
  const { session } = req.body;

  if (isMockMode()) {
    const totalScore = session.turns.length > 0
      ? Math.round(session.turns.reduce((acc: number, t: any) => acc + (t.evaluation?.score || 80), 0) / session.turns.length)
      : 82;

    const report = {
      overallScore: totalScore,
      hireReadiness: totalScore >= 88 ? "Strong Hire" : totalScore >= 75 ? "Hire" : "No Hire",
      justification: `The candidate demonstrated strong foundational problem-solving skills and technical readiness for a ${session.config.role} position at ${session.config.company || "our enterprise"}. They showed robust familiarity with engineering concepts.`,
      communicationFeedback: "Communication was structured and direct, though pace can occasionally be slowed down during complex explanations to prevent using fillers like 'like' or 'basically'.",
      technicalFeedback: "Excellent technical alignment, particularly with React design patterns and backend schema normalization, although adding deeper performance trade-off analysis would be valuable.",
      strengths: ["Highly responsive structured explanations", "Explicit references to system reliability", "Great analytical framing"],
      weaknesses: ["Occasional overuse of speech filler words", "Result/metrics part of some behavioral stories could be sharper"],
      practicePlan: "Recommend practicing behavioral challenges with an active stopwatch, recording answers, and strictly enforcing the STAR format. Additionally, review cache eviction policies and database lock mechanisms.",
      roadmap7Days: [
        "Day 1: Perfect the opening narrative & career trajectory alignment.",
        "Day 2: Dive deep into STAR analysis, rewriting past projects as Situation-Task-Action-Result logs.",
        "Day 3: Focus on speech clarity. Record answers and eliminate conversational fillers.",
        "Day 4: Technical review of cache failure modes, Redis, and network performance optimizations.",
        "Day 5: Practice system design layouts with scalable architectural diagrams.",
        "Day 6: Complete a full-length 30-minute automated simulated pressure test.",
        "Day 7: Rest, review the core portfolio logs, and enter the actual interview with confidence."
      ],
      homework: [
        {
          title: "Optimize Heavy React Renderers",
          type: "LeetCode",
          difficulty: "Medium",
          description: "Analyze code involving complex nested arrays rendering. Optimize utilizing useMemo and React.memo to prevent unwanted re-rendering cycles.",
          hint: "Pay attention to dependency arrays, keeping callback closures memoized with useCallback."
        },
        {
          title: "Design a Geo-Distributed Notification Dispatcher",
          type: "System Design",
          difficulty: "Hard",
          description: "Design a notification dispatcher capable of routing SMS, Email, and Push alerts within 2 seconds. Must handle 50,000 requests/sec with exponential backoff on vendor failures.",
          hint: "Incorporate Redis pub/sub queues and a dedicated rate-limiter layer."
        },
        {
          title: "STAR Behavioral Masterclass",
          type: "HR behavioral",
          difficulty: "Easy",
          description: "Refactor your previous answer about conflict with a team member. Rewrite it into exact paragraphs mapping out [S] [T] [A] [R] structure.",
          hint: "Ensure you include exact numerical results (e.g. 'reduced cycle times by 15%')."
        }
      ],
      flashcards: [
        {
          id: "flash_1",
          topic: "Redis Eviction",
          question: "What is LRU vs LFU caching eviction in Redis, and which is better for heavy static catalogs?",
          mistakeContext: "Vague description of memory exhaustion.",
          correctConcept: "LRU (Least Recently Used) evicts keys unused for the longest duration, which is ideal for static item list catalogs. LFU (Least Frequently Used) counts access frequency."
        },
        {
          id: "flash_2",
          topic: "React Cleanups",
          question: "How do you avoid memory leaks and race conditions in React useEffect data fetching?",
          mistakeContext: "Ignored the clean-up return closure, leading to potential updates on unmounted components.",
          correctConcept: "Implement an active boolean flag inside useEffect, toggled to false in the clean-up return closure, to ignore stale in-flight results."
        }
      ],
      quiz: [
        {
          id: "mcq_1",
          question: "What Redis data structure is most appropriate for a sliding-window rate limiter?",
          options: [
            "String keys with simple INCR",
            "Sorted Set (ZSET) storing timestamps",
            "Hash store mapping user IPs",
            "HyperLogLog approximation"
          ],
          correctAnswer: "Sorted Set (ZSET) storing timestamps",
          explanation: "A Sorted Set (ZSET) allows adding timestamps as scores, pruning items older than the threshold, and counting remaining elements within the sliding window, which is extremely robust."
        },
        {
          id: "mcq_2",
          question: "Which hook prevents child components from re-rendering when parent state changes if their props are primitive?",
          options: [
            "useMemo",
            "useCallback",
            "React.memo",
            "useRef"
          ],
          correctAnswer: "React.memo",
          explanation: "Wrapping a functional child component in React.memo prevents it from re-rendering on parent updates if its props remain unchanged based on shallow equality comparison."
        }
      ],
      personalityProfile: {
        leadership: 78,
        teamwork: 84,
        ownership: 88,
        curiosity: 92,
        adaptability: 80,
        communicationStyle: "Structured, technically precise, and highly clear, though exhibiting minor pacing rushes during stressful technical depth questioning."
      },
      speakingTimeline: [
        {
          timeRange: "0:00 - 0:30",
          assessment: "Excellent Intro",
          note: "Enthusiastic greeting with centered posture, low filler rate."
        },
        {
          timeRange: "0:30 - 1:15",
          assessment: "Strong Tech Explanation",
          note: "Gave great details of system parameters, though used 'actually' three times."
        },
        {
          timeRange: "1:15 - end",
          assessment: "Rushed Conclusion",
          note: "Speech speed reached 180 WPM. Recommend pausing before your concluding sentence."
        }
      ]
    };

    return res.json(report);
  }

  try {
    const ai = getAI();
    
    const turnsSummary = session.turns.map((t: any, i: number) => `
Turn ${i+1}:
Question Asked: ${t.question}
Answer Provided: ${t.answer}
Score: ${t.evaluation?.score || "N/A"}
Strengths Mentioned: ${t.evaluation?.strengths?.join(", ") || "None"}
Weaknesses Mentioned: ${t.evaluation?.weaknesses?.join(", ") || "None"}
`).join("\n");

    const systemPrompt = `You are a Principal Hiring Committee Director at ${session.config.company || "an elite firm"}.
Analyze the entire mock interview session and generate an exhaustive, world-class hiring readiness scorecard.

INTERVIEW CONFIG:
Role: ${session.config.role}
Difficulty: ${session.config.difficulty}
Mode: ${session.config.mode}
Company: ${session.config.company}

SESSION TRANSCRIPT & SCORES:
${turnsSummary}

YOUR TASK:
Synthesize the entire session. Generate:
1. Overall score (0-100).
2. Hire Readiness recommendation ("Hire", "Strong Hire", "No Hire") with a clear business justification.
3. In-depth Communication feedback.
4. In-depth Technical feedback.
5. Overall Strengths (bulleted list).
6. Overall Weaknesses (bulleted list).
7. Tailored Practice plan.
8. A customized 7-day roadmap with concrete daily action items to perfect the candidate's skills.
9. Generating learning tools: homework assignments (array of 3 with title, type, difficulty, description, hint), flashcards (array of 2 targeting candidate's key mistakes), and MCQ quiz (array of 2 multiple-choice questions with options, correctAnswer, explanation).
10. Personality profile scores (leadership, teamwork, ownership, curiosity, adaptability as integers 0-100 and communicationStyle as a string).
11. Speaking timeline segments (at least 2 segments showing timeRange, assessment, and note).

You MUST return the output strictly formatted as JSON according to the following schema:
{
  "overallScore": number,
  "hireReadiness": "Hire" | "Strong Hire" | "No Hire",
  "justification": string,
  "communicationFeedback": string,
  "technicalFeedback": string,
  "strengths": string[],
  "weaknesses": string[],
  "practicePlan": string,
  "roadmap7Days": string[],
  "homework": [
    { "title": string, "type": "LeetCode" | "HR behavioral" | "System Design", "difficulty": "Easy" | "Medium" | "Hard", "description": string, "hint": string }
  ],
  "flashcards": [
    { "id": string, "topic": string, "question": string, "mistakeContext": string, "correctConcept": string }
  ],
  "quiz": [
    { "id": string, "question": string, "options": string[], "correctAnswer": string, "explanation": string }
  ],
  "personalityProfile": {
    "leadership": number,
    "teamwork": number,
    "ownership": number,
    "curiosity": number,
    "adaptability": number,
    "communicationStyle": string
  },
  "speakingTimeline": [
    { "timeRange": string, "assessment": string, "note": string }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: [
            "overallScore",
            "hireReadiness",
            "justification",
            "communicationFeedback",
            "technicalFeedback",
            "strengths",
            "weaknesses",
            "practicePlan",
            "roadmap7Days",
            "homework",
            "flashcards",
            "quiz",
            "personalityProfile",
            "speakingTimeline"
          ],
          properties: {
            overallScore: { type: Type.INTEGER },
            hireReadiness: { type: Type.STRING, enum: ["Hire", "Strong Hire", "No Hire"] },
            justification: { type: Type.STRING },
            communicationFeedback: { type: Type.STRING },
            technicalFeedback: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            practicePlan: { type: Type.STRING },
            roadmap7Days: { type: Type.ARRAY, items: { type: Type.STRING } },
            homework: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["title", "type", "difficulty", "description", "hint"],
                properties: {
                  title: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["LeetCode", "HR behavioral", "System Design"] },
                  difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
                  description: { type: Type.STRING },
                  hint: { type: Type.STRING }
                }
              }
            },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "topic", "question", "mistakeContext", "correctConcept"],
                properties: {
                  id: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  question: { type: Type.STRING },
                  mistakeContext: { type: Type.STRING },
                  correctConcept: { type: Type.STRING }
                }
              }
            },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "question", "options", "correctAnswer", "explanation"],
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                }
              }
            },
            personalityProfile: {
              type: Type.OBJECT,
              required: ["leadership", "teamwork", "ownership", "curiosity", "adaptability", "communicationStyle"],
              properties: {
                leadership: { type: Type.INTEGER },
                teamwork: { type: Type.INTEGER },
                ownership: { type: Type.INTEGER },
                curiosity: { type: Type.INTEGER },
                adaptability: { type: Type.INTEGER },
                communicationStyle: { type: Type.STRING }
              }
            },
            speakingTimeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["timeRange", "assessment", "note"],
                properties: {
                  timeRange: { type: Type.STRING },
                  assessment: { type: Type.STRING },
                  note: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const report = JSON.parse(response.text.trim());
    res.json(report);
  } catch (error: any) {
    console.error("Error generating final report:", error);
    res.status(500).json({ error: error.message || "Failed to generate final report." });
  }
});

// 5. Generate TTS Speech using Gemini TTS Model
app.post("/api/tts", async (req, res) => {
  const { text, personality } = req.body;

  if (isMockMode()) {
    // Return empty audio indicator so client can fall back to beautiful browser speech synthesis
    return res.json({ audio: null });
  }

  try {
    const ai = getAI();
    
    // Choose appropriate voice based on personality
    let voiceName = "Kore"; // default cheerful/friendly
    if (personality === "Strict Technical Lead" || personality === "Fast-paced Recruiter") {
      voiceName = "Fenrir"; // deep/neutral/authoritative
    } else if (personality === "Startup Founder") {
      voiceName = "Puck"; // energetic
    } else if (personality === "Calm Senior Engineer") {
      voiceName = "Zephyr"; // smooth/calm
    }

    const ttsPrompt = `Say clearly: ${text}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: ttsPrompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audio: base64Audio });
    } else {
      res.json({ audio: null });
    }
  } catch (error: any) {
    console.error("TTS generation error (falling back to browser TTS):", error);
    res.json({ audio: null }); // Fallback gracefully to Web Speech API
  }
});


// Configure Vite Dev Server or Production Static Hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Interview Copilot server running on port ${PORT}`);
  });
}

startServer();
