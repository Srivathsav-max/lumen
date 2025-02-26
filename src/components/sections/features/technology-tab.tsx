import React from 'react';
import { FeatureCard } from './feature-card';
import { BrainCircuit, BookText, Network, LineChart } from "lucide-react";

export const TechnologyTab = () => {
  return (
    <div>
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">AI-Powered Core Technology</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Moxium combines advanced AI models to create a personalized and adaptive learning experience that evolves with each student.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <FeatureCard
          icon={<BrainCircuit className="w-full h-full" />}
          title="Adaptive Learning Algorithms"
          description="Advanced learning models track student progress in real-time, identifying knowledge gaps and ensuring deep understanding of core concepts."
          code={`// Adaptive Progress Tracking
interface Learner {
  id: string;
  history: LearningHistory;
  profile: UserProfile;
}

interface LearningHistory {
  completedTopics: string[];
  scores: Record<string, number>;
}

interface UserProfile {
  learningStyle: string;
  pace: "slow" | "medium" | "fast";
}

const assessProgress = (learner: Learner, concept: string): number => {
  // Analyze learning signals
  const basicScore = getBasicMetrics(learner.id);
  const advancedScore = getDetailedMetrics(learner.history);
  
  // Combined evaluation
  return calculateWeightedScore(
    basicScore,
    advancedScore,
    learner.profile
  );
};

// Update progress
updateProgress(studentId, {
  topic: "programming",
  progressLevel: "intermediate" as const,
  timeSpent: 45
});`}
          codeTitle="progress-tracking.ts"
          language="typescript"
        />
        
        <FeatureCard
          icon={<Network className="w-full h-full" />}
          title="Knowledge Graph Modeling"
          description="Visualize and navigate complex concept relationships with interactive knowledge graphs, helping identify prerequisite knowledge gaps."
          code={`// Knowledge Structure Analysis
interface Topic {
  id: string;
  name: string;
  difficulty: number;
  prerequisites: string[];
}

const analyzeTopics = (learner: Learner, topicId: string): number => {
  // Get related learning concepts
  const related: Topic[] = getRelatedTopics(topicId);
  
  // Calculate understanding level
  let topicScore = 0;
  related.forEach(topic => {
    // Evaluate understanding depth
    topicScore += getTopicStrength(
      learner.profile,
      topic.id
    );
  });
  
  return generateInsights(topicScore, related.length);
};

// Create learning path
if (needsReview(student, "advanced_topics")) {
  createCustomPath(student, "advanced_topics");
}`}
          codeTitle="topic-analysis.ts"
          language="typescript"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard
          icon={<LineChart className="w-full h-full" />}
          title="Adaptive Path Optimization"
          description="Smart optimization algorithms create personalized learning paths by balancing progress, engagement, and cognitive well-being."
          code={`// Learning Path Optimization
interface LearningMetrics {
  progress: number;
  engagement: "low" | "medium" | "high";
  complexity: "basic" | "moderate" | "advanced";
  preferences: UserPreferences;
}

interface UserPreferences {
  learningStyle: string;
  pacePreference: number;
  topicInterests: string[];
}

const optimizePath = (metrics: LearningMetrics): Recommendation => {
  // Analyze learning metrics
  const improvement = getDeltaProgress(metrics);
  const focus = getEngagementLevel(metrics);
  const capacity = getCognitiveLoad(metrics);
  
  // Calculate optimal path
  return balanceFactors(
    improvement,
    focus,
    capacity,
    metrics.preferences
  );
};

// Adjust difficulty
const nextModule: LearningMetrics = {
  progress: 0.75,
  engagement: "high",
  complexity: "moderate",
  preferences: {
    learningStyle: "visual",
    pacePreference: 0.8,
    topicInterests: ["algorithms", "systems"]
  }
};

const recommendation = optimizePath(nextModule);`}
          codeTitle="path-optimizer.ts"
          language="typescript"
        />
        
        <FeatureCard
          icon={<BookText className="w-full h-full" />}
          title="Content Generation & Validation"
          description="AI-powered content generation creates personalized learning materials tailored to each student's unique learning style and progress."
          code={`// Smart Content Generation
interface ContentParams {
  subject: string;
  difficulty: number;
  style: UserPreferences;
  history: LearningHistory;
  format: "text" | "interactive" | "video";
}

interface QualityCheck {
  passed: boolean;
  score: number;
  issues?: string[];
}

const createContent = async (
  topic: string, 
  level: number,
  studentProfile: UserProfile
): Promise<Content> => {
  // Get learning materials
  const materials = await getMaterials(topic);
  
  // Generate personalized content
  const content = await generator.create({
    subject: topic,
    difficulty: level,
    style: studentProfile.preferences,
    history: studentProfile.progress,
    format: "interactive"
  } as ContentParams);
  
  // Quality check
  const quality: QualityCheck = await validateQuality(content);
  
  return quality.passed ? content : getBackupContent(topic);
};`}
          codeTitle="content-creator.ts"
          language="typescript"
        />
      </div>
    </div>
  );
};
