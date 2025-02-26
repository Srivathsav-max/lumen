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
const assessProgress = (learner, concept) => {
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
  progressLevel: "intermediate",
  timeSpent: 45
});`}
          codeTitle="progress-tracking.js"
          language="JavaScript"
        />
        
        <FeatureCard
          icon={<Network className="w-full h-full" />}
          title="Knowledge Graph Modeling"
          description="Visualize and navigate complex concept relationships with interactive knowledge graphs, helping identify prerequisite knowledge gaps."
          code={`// Knowledge Structure Analysis
const analyzeTopics = (learner, topicId) => {
  // Get related learning concepts
  const related = getRelatedTopics(topicId);
  
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
          codeTitle="topic-analysis.js"
          language="JavaScript"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard
          icon={<LineChart className="w-full h-full" />}
          title="Adaptive Path Optimization"
          description="Smart optimization algorithms create personalized learning paths by balancing progress, engagement, and cognitive well-being."
          code={`// Learning Path Optimization
const optimizePath = (metrics) => {
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
const nextModule = {
  progress: 0.75,
  engagement: "high",
  complexity: "moderate"
};

const recommendation = optimizePath(nextModule);`}
          codeTitle="path-optimizer.js"
          language="JavaScript"
        />
        
        <FeatureCard
          icon={<BookText className="w-full h-full" />}
          title="Content Generation & Validation"
          description="AI-powered content generation creates personalized learning materials tailored to each student's unique learning style and progress."
          code={`// Smart Content Generation
const createContent = async (topic, level, 
                         studentProfile) => {
  // Get learning materials
  const materials = await getMaterials(topic);
  
  // Generate personalized content
  const content = await generator.create({
    subject: topic,
    difficulty: level,
    style: studentProfile.preferences,
    history: studentProfile.progress,
    format: "interactive"
  });
  
  // Quality check
  const quality = await validateQuality(content);
  
  return quality.passed ? content : getBackupContent(topic);
};`}
          codeTitle="content-creator.js"
          language="JavaScript"
        />
      </div>
    </div>
  );
};
