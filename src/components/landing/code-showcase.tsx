"use client";
import React, { useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BoxReveal } from "@/components/magicui/box-reveal";
import { IconTerminal, IconCode, IconDatabase, IconApi } from "@tabler/icons-react";

const codeExamples = {
  knowledge: {
    title: "Knowledge Creation",
    description: "Create and organize knowledge with AI-powered intelligence",
    icon: <IconApi className="h-5 w-5" />,
    code: `import { lumen } from '@lumen/sdk'

const client = lumen.createClient({
  apiKey: process.env.LUMEN_API_KEY,
  workspace: 'team-innovation'
})

// Create knowledge with AI enhancement
const knowledge = await client.knowledge.create({
  title: "Mobile App Architecture",
  content: \`
    # System Architecture Overview
    
    Our mobile app follows a clean architecture pattern...
  \`,
  type: "technical-doc",
  ai: {
    generateSummary: true,
    extractKeyPoints: true,
    suggestTags: true,
    linkRelatedContent: true
  }
})

// AI automatically generates:
// - Executive summary
// - Key takeaways
// - Relevant tags
// - Links to related documents

console.log('Knowledge created with AI insights:', knowledge.aiInsights)`,
    language: "typescript"
  },
  search: {
    title: "Smart Search",
    description: "Semantic search across all your team's knowledge",
    icon: <IconCode className="h-5 w-5" />,
    code: `import { KnowledgeSearch } from '@lumen/react'

export default function Dashboard() {
  const handleSearch = async (query: string) => {
    // Semantic search across all content types
    const results = await client.search({
      query,
      semantic: true,
      filters: {
        workspace: 'engineering',
        lastModified: '30d',
        contentType: ['docs', 'notes', 'discussions']
      },
      features: {
        highlightContext: true,
        relatedSuggestions: true,
        authorInsights: true
      }
    })
    
    return results
  }

  return (
    <KnowledgeSearch
      onSearch={handleSearch}
      placeholder="Ask anything about your team's knowledge..."
      showFilters={true}
      showSuggestions={true}
    />
  )
}`,
    language: "tsx"
  },
  ai: {
    title: "AI Integration",
    description: "Transform raw content into structured knowledge",
    icon: <IconDatabase className="h-5 w-5" />,
    code: `// Meeting transcript to structured knowledge
const meeting = await client.ai.processTranscript({
  audio: meetingRecording,
  participants: ['sarah', 'john', 'alex'],
  context: {
    project: 'mobile-redesign',
    meetingType: 'planning'
  }
})

// AI automatically creates:
// 1. Meeting summary
// 2. Action items with owners
// 3. Key decisions made
// 4. Follow-up questions
// 5. Links to relevant documents

await client.knowledge.create({
  title: \`\${meeting.title} - Meeting Notes\`,
  content: meeting.structuredNotes,
  actionItems: meeting.actionItems,
  participants: meeting.participants,
  aiGenerated: true,
  relatedDocuments: meeting.relatedLinks
})

// Auto-notify stakeholders
await client.notifications.send({
  to: meeting.participants,
  template: 'meeting-summary',
  data: meeting.summary
})`,
    language: "typescript"
  },
  collaboration: {
    title: "Real-time Collaboration",
    description: "Work together on knowledge in real-time",
    icon: <IconTerminal className="h-5 w-5" />,
    code: `import { useCollaboration } from '@lumen/hooks'

export function KnowledgeEditor({ documentId }) {
  const {
    document,
    activeUsers,
    comments,
    suggestions,
    saveDocument,
    addComment,
    reactToContent
  } = useCollaboration(documentId)

  // Real-time features automatically handled:
  // - Live cursor tracking
  // - Conflict resolution
  // - Comment threads
  // - Suggestion mode
  // - Version history

  return (
    <div className="editor-container">
      <CollaborationBar users={activeUsers} />
      <Editor
        content={document.content}
        onChange={saveDocument}
        comments={comments}
        onComment={addComment}
      />
      <SuggestionPanel
        suggestions={suggestions}
        onAccept={(id) => applySuggestion(id)}
      />
    </div>
  )
}`,
    language: "tsx"
  }
};

export function CodeShowcase({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = useState<keyof typeof codeExamples>('knowledge');
  const activeExample = codeExamples[activeTab];

  return (
    <section className={cn("relative py-24 md:py-32", className)} id="demo">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <BoxReveal boxColor="#3b82f6" duration={0.5}>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl lg:text-5xl dark:text-white">
              Built for modern{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                knowledge teams
              </span>
            </h2>
          </BoxReveal>
          <BoxReveal boxColor="#8b5cf6" duration={0.6}>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Powerful APIs, AI-driven insights, and seamless integrations make knowledge work effortless.
            </p>
          </BoxReveal>
        </div>

        <div className="mx-auto max-w-6xl">
          {/* Tab navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-8 flex flex-wrap justify-center gap-2"
          >
            {Object.entries(codeExamples).map(([key, example]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as keyof typeof codeExamples)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                  activeTab === key
                    ? "bg-blue-50 text-blue-700 ring-2 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900/50"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200"
                )}
              >
                <span className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded text-xs",
                  activeTab === key
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-500"
                )}>
                  {example.icon}
                </span>
                {example.title}
              </button>
            ))}
          </motion.div>

          {/* Code display */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Example description */}
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {activeExample.description}
              </p>
            </div>

            {/* Code block container */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-950 shadow-2xl ring-1 ring-black/5 dark:border-gray-800/80 dark:ring-white/10">
              {/* Terminal header */}
              <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-400">
                    {activeExample.title.toLowerCase().replace(' ', '-')}.{activeExample.language === 'bash' ? 'sh' : activeExample.language}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  <span className="text-xs text-gray-500">Connected</span>
                </div>
              </div>
              
              {/* Code content */}
              <div className="p-6">
                <CodeBlock 
                  language={activeExample.language} 
                  code={activeExample.code}
                  filename=""
                />
              </div>
            </div>

            {/* Floating indicators */}
            <div className="absolute -left-4 top-1/2 hidden -translate-y-1/2 transform lg:block">
              <div className="rounded-full bg-blue-100 p-3 shadow-lg dark:bg-blue-900/30">
                <IconCode className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 transform lg:block">
              <div className="rounded-full bg-purple-100 p-3 shadow-lg dark:bg-purple-900/30">
                <IconTerminal className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </motion.div>

          {/* Bottom features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800/50">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-gray-700 dark:text-gray-300">AI-powered</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800/50">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Real-time collaboration</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800/50">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span className="text-gray-700 dark:text-gray-300">Enterprise ready</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}


