import { UserProfile, InterviewSession, Achievement } from "../types";

export const ACHIEVEMENTS_TEMPLATES = [
  {
    id: "first_contact",
    title: "First Contact",
    description: "Successfully complete your first mock interview session.",
    iconName: "Compass",
    category: "practice" as const,
    requirement: "1 session run"
  },
  {
    id: "practiced_cadet",
    title: "Practiced Cadet",
    description: "Establish consistency by running 5 mock interview sessions.",
    iconName: "TrendingUp",
    category: "practice" as const,
    requirement: "5 sessions run"
  },
  {
    id: "interview_elite",
    title: "Interview Elite",
    description: "Complete 10 high-fidelity mock interview sessions.",
    iconName: "Award",
    category: "practice" as const,
    requirement: "10 sessions run"
  },
  {
    id: "stellar_performer",
    title: "Stellar Performer",
    description: "Achieve an overall session rating of 95% or higher.",
    iconName: "Sparkles",
    category: "score" as const,
    requirement: "95% score"
  },
  {
    id: "perfect_score",
    title: "Perfect Score",
    description: "Get a flawless 100% score on a completed interview session.",
    iconName: "Trophy",
    category: "score" as const,
    requirement: "100% score"
  },
  {
    id: "hot_streak",
    title: "Hot Streak",
    description: "Practice for 3 consecutive days to build muscle memory.",
    iconName: "Flame",
    category: "streak" as const,
    requirement: "3-day streak"
  },
  {
    id: "streak_master",
    title: "Streak Master",
    description: "Achieve a solid 7-day practice streak.",
    iconName: "Zap",
    category: "streak" as const,
    requirement: "7-day streak"
  },
  {
    id: "high_roller",
    title: "High Roller",
    description: "Collect a cumulative total of 500 performance points.",
    iconName: "Coins",
    category: "score" as const,
    requirement: "500 total points"
  },
  {
    id: "elite_scholar",
    title: "Elite Scholar",
    description: "Collect a massive cumulative total of 1000 performance points.",
    iconName: "Crown",
    category: "score" as const,
    requirement: "1000 total points"
  },
  {
    id: "goal_crusher",
    title: "Goal Crusher",
    description: "Complete all of your assigned daily preparation goals.",
    iconName: "CheckCircle2",
    category: "goal" as const,
    requirement: "All daily goals completed"
  }
];

export function getAchievements(
  profile: UserProfile | null,
  pastSessions: InterviewSession[]
): Achievement[] {
  // If no profile, we can calculate transient achievements using pastSessions alone!
  // This provides immediate visual feedback even for unauthenticated local guest users!
  const sessionsCount = profile ? profile.sessionsCount : pastSessions.length;
  const totalScore = profile ? profile.totalScore : pastSessions.reduce((acc, s) => {
    if (s.turns.length === 0) return acc;
    const scoreSum = s.turns.reduce((tAcc, t) => tAcc + (t.evaluation?.score || 80), 0);
    return acc + Math.round(scoreSum / s.turns.length);
  }, 0);
  const streak = profile ? profile.streak : (pastSessions.length > 0 ? 1 : 0);

  // Get max session score from past sessions
  let maxSessionScore = 0;
  pastSessions.forEach((s) => {
    if (s.turns.length > 0) {
      const scoreSum = s.turns.reduce((acc, t) => acc + (t.evaluation?.score || 80), 0);
      const sessionAvg = Math.round(scoreSum / s.turns.length);
      if (sessionAvg > maxSessionScore) {
        maxSessionScore = sessionAvg;
      }
    }
  });

  // Check goals
  const goalsTotal = profile?.dailyGoals?.length || 0;
  const goalsCompleted = profile?.dailyGoals?.filter((g) => g.completed).length || 0;

  return ACHIEVEMENTS_TEMPLATES.map((tpl) => {
    let isUnlocked = false;
    let progressText = "";
    let progressPercent = 0;

    switch (tpl.id) {
      case "first_contact": {
        isUnlocked = sessionsCount >= 1;
        progressPercent = Math.min((sessionsCount / 1) * 100, 100);
        progressText = `${sessionsCount}/1 session`;
        break;
      }
      case "practiced_cadet": {
        isUnlocked = sessionsCount >= 5;
        progressPercent = Math.min((sessionsCount / 5) * 100, 100);
        progressText = `${sessionsCount}/5 sessions`;
        break;
      }
      case "interview_elite": {
        isUnlocked = sessionsCount >= 10;
        progressPercent = Math.min((sessionsCount / 10) * 100, 100);
        progressText = `${sessionsCount}/10 sessions`;
        break;
      }
      case "stellar_performer": {
        isUnlocked = maxSessionScore >= 95;
        progressPercent = Math.min((maxSessionScore / 95) * 100, 100);
        progressText = `Best: ${maxSessionScore}% (Need 95%)`;
        break;
      }
      case "perfect_score": {
        isUnlocked = maxSessionScore >= 100;
        progressPercent = Math.min((maxSessionScore / 100) * 100, 100);
        progressText = `Best: ${maxSessionScore}% (Need 100%)`;
        break;
      }
      case "hot_streak": {
        isUnlocked = streak >= 3;
        progressPercent = Math.min((streak / 3) * 100, 100);
        progressText = `${streak}/3 days`;
        break;
      }
      case "streak_master": {
        isUnlocked = streak >= 7;
        progressPercent = Math.min((streak / 7) * 100, 100);
        progressText = `${streak}/7 days`;
        break;
      }
      case "high_roller": {
        isUnlocked = totalScore >= 500;
        progressPercent = Math.min((totalScore / 500) * 100, 100);
        progressText = `${totalScore}/500 pts`;
        break;
      }
      case "elite_scholar": {
        isUnlocked = totalScore >= 1000;
        progressPercent = Math.min((totalScore / 1000) * 100, 100);
        progressText = `${totalScore}/1000 pts`;
        break;
      }
      case "goal_crusher": {
        isUnlocked = goalsTotal > 0 && goalsCompleted === goalsTotal;
        progressPercent = goalsTotal > 0 ? (goalsCompleted / goalsTotal) * 100 : 0;
        progressText = goalsTotal > 0 ? `${goalsCompleted}/${goalsTotal} goals` : "No goals active";
        break;
      }
    }

    return {
      ...tpl,
      isUnlocked,
      progressText,
      progressPercent: Math.round(progressPercent)
    };
  });
}
