# Core Product Architecture & Methodology

## Graph-Enhanced Reinforcement Learning Framework

At its core, Moxium leverages advanced machine learning techniques to create a highly personalized learning experience. Our architecture combines several key components that work together to understand, track, and optimize each learner's educational journey.

## Personalization: Modeling the Learner's Knowledge State

The foundation of Moxium's personalization system lies in its ability to accurately model and track a learner's understanding of various concepts through a sophisticated combination of complementary approaches.

### Bayesian Knowledge Tracing (BKT) with Deep Knowledge Tracing (DKT)

Our primary goal is to estimate, with high accuracy, the probability that a learner has mastered a specific concept at any given time. This real-time assessment enables Moxium to make informed decisions about content presentation and difficulty adjustment.

**BKT Formulation:**
This classical approach models knowledge acquisition as a Hidden Markov Model with:
- Binary latent variable (Lt) representing mastery state (1 = mastered, 0 = unmastered)
- Observations (Ot) indicating correctness (1 = correct, 0 = incorrect)
- Parameters including initial probability of mastery, transition probability, guess probability, and slip probability

Each time a student interacts with the system, we update our belief about their knowledge state using Bayesian inference equations that capture the probability of mastery given all observations.

**DKT Integration:**
We augment BKT with Long Short-Term Memory networks to model sequential dependencies:
- LSTM processes inputs including question IDs, correctness, and timing information
- A hybrid approach balances the interpretability of BKT with the sequence modeling power of deep learning
- This combination provides more nuanced mastery probability estimates

### Graph Neural Networks (GNNs) for Hidden Gap Detection

One of Moxium's most innovative features is its ability to detect and address knowledge gaps before they become problematic. We utilize Graph Neural Networks to model the intricate relationships between different concepts.

**Knowledge Graph Construction:**
- Nodes represent concepts (e.g., "Variables," "Recursion")
- Edges represent prerequisite relationships between concepts

**GNN Propagation:**
The Graph Neural Network propagates information between connected concepts, allowing us to identify potential areas where a learner might struggle based on their current understanding.

**Gap Prediction:**
If a student struggles with a concept, we can calculate risk scores for related concepts and trigger remediation if the risk exceeds defined thresholds.

## AI-Driven Decision-Making & Recommendation Engine

The heart of Moxium's adaptive learning system is its sophisticated decision-making engine that continuously analyzes learner performance and behavior.

### Reinforcement Learning (RL) for Path Optimization

We implement a state-of-the-art reinforcement learning system that treats the learning process as a sequential decision-making problem:

**State Space:**
- Includes mastery vectors, fatigue levels, and engagement metrics
- Captures both knowledge and behavioral aspects

**Reward Function:**
Our reward function balances three critical aspects of learning:
- Change in mastery level (60% weight)
- Engagement level (30% weight)
- Fatigue management (-10% weight)

**Policy Gradient Updates:**
We use policy gradient methods to optimize the decision-making process over time.

### Thompson Sampling for Content Selection

We employ a multi-armed bandit approach for question selection:
- Each question has a Beta distribution representing uncertainty about its effectiveness
- Questions are selected probabilistically based on their expected effectiveness
- The model updates after each attempt, increasing success or failure counts

### Item Response Theory (IRT) for Stealth Assessment

We implement the Three-Parameter Logistic Model to relate student ability to question characteristics:
- Discrimination (how well the question differentiates between ability levels)
- Difficulty (ability level needed for 50% chance of correct answer)
- Guessing parameter (probability of correct answer by guessing)

This allows for adaptive testing that maximizes information gain about the student's ability level with each question.

## Data Sources & User Input Handling

Moxium collects and processes both explicit and implicit signals from users to build comprehensive learning profiles.

### Explicit Inputs
- **Psychometric Surveys:** Combine self-reported data with quiz performance
- **Self-Reported Confidence:** Model confidence using response time patterns

### Implicit Signals
- **Response Time Modeling:** Analyze normally distributed times for each concept
- **Error Persistence:** Detect knowledge gaps using exponential models of consecutive errors

### Privacy-Preserving Learning
We implement Federated Learning to protect user privacy while still enabling model improvements:
- Models train locally on user devices
- Only model updates (not raw data) are aggregated
- Differential privacy techniques add noise to ensure individual data cannot be reconstructed
