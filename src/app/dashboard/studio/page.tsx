"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api-client";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable";
import { 
  Upload, 
  FileText, 
  RefreshCw, 
  Send,
  Brain,
  File,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  X,
  ChevronRight,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

type DocItem = { 
  id: string; 
  original_filename: string; 
  mime_type: string; 
  size_bytes: number; 
  status: string; 
};

const MindMap = dynamic(() => import("@/components/studio/mindmap").then(m => ({ default: m.MindMap })), { ssr: false });

export default function StudioPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [mindmapData, setMindmapData] = useState<any>(null);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [studioPageId, setStudioPageId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; metadata?: any }>>([]);
  const historyLoadedFor = useRef<string | null>(null);
  const [isMindmapCanvasOpen, setIsMindmapCanvasOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getValidWorkspaceId = async (): Promise<number> => {
    const storedId = localStorage.getItem("lumen-current-workspace-id");
    if (storedId && storedId !== "0") {
      const id = parseInt(storedId, 10);
      if (id > 0) return id;
    }
    
    try {
      const res = await api.get("/notes/workspaces");
      const workspaces = res?.data?.data || [];
      if (workspaces.length > 0) {
        const firstWorkspace = workspaces[0];
        localStorage.setItem("lumen-current-workspace-id", firstWorkspace.id.toString());
        return firstWorkspace.id;
      }
      
      const createRes = await api.post("/notes/workspaces", {
        name: "My Knowledge Base",
        description: "Default workspace for knowledge management"
      });
      const newWorkspace = createRes?.data?.data;
      if (newWorkspace) {
        localStorage.setItem("lumen-current-workspace-id", newWorkspace.id.toString());
        return newWorkspace.id;
      }
    } catch (error) {
      console.error("Error managing workspaces:", error);
    }
    
    throw new Error("Could not get or create a valid workspace");
  };

  const loadDocs = async () => {
    try {
      if (!workspaceId) return;
      const res = await api.get(`/noteslm/files?workspace_id=${workspaceId}`);
      setDocs(res?.data?.data || []);
    } catch (error) {
      console.error("Error loading docs:", error);
    }
  };

  const loadChatHistory = useCallback(async () => {
    if (!studioPageId) return;
    try {
      const res = await api.get(`/ai/chat/history?type=studio&page_id=${encodeURIComponent(studioPageId)}`);
      const items = (res?.data?.data ?? []) as Array<{ role: 'user'|'assistant'; content: string; metadata?: any }>;
      if (Array.isArray(items)) {
        setMessages(items.map(m => ({ role: m.role, content: m.content, metadata: m.metadata })));
        // hydrate mindmap from latest assistant message metadata if present
        for (let i = items.length - 1; i >= 0; i--) {
          const m = items[i];
          if (m.role === 'assistant' && m.metadata && (m.metadata.mindmap || (m.metadata as any).mindMap)) {
            const mm = (m.metadata.mindmap || (m.metadata as any).mindMap);
            if (mm && Array.isArray(mm.nodes) && mm.nodes.length > 0) {
              setMindmapData(mm);
              break;
            }
          }
        }
        historyLoadedFor.current = studioPageId;
      }
    } catch (e) {
      // ignore
      setMessages([]);
      historyLoadedFor.current = studioPageId;
    }
  }, [studioPageId]);

  useEffect(() => {
    const initializeWorkspace = async () => {
      try {
        const validWorkspaceId = await getValidWorkspaceId();
        setWorkspaceId(validWorkspaceId);
      } catch (error) {
        console.error("Failed to initialize workspace:", error);
      }
    };
    initializeWorkspace();
  }, []);

  useEffect(() => {
    if (workspaceId) {
      loadDocs();
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    try {
      const stored = localStorage.getItem(`lumen-current-studio-page-${workspaceId}`);
      if (stored) setStudioPageId(stored);
    } catch {}
    const onSelected = (e: Event) => {
      const { pageId } = (e as CustomEvent<{ workspaceId: number; pageId: string }>).detail || ({} as any);
      if (pageId) {
        setStudioPageId(pageId);
        setMessages([]);
        historyLoadedFor.current = null;
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('lumen:studio-page-selected', onSelected as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('lumen:studio-page-selected', onSelected as EventListener);
      }
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!studioPageId) return;
    if (historyLoadedFor.current === studioPageId) return;
    void loadChatHistory();
  }, [studioPageId, loadChatHistory]);

  const onAsk = async () => {
    if (!workspaceId || !query.trim()) return;
    
    try {
      setIsLoading(true);
      setMessages((prev) => [...prev, { role: 'user', content: query, metadata: { tools: { mindmap: false } } }]);
      const res = await api.post("/noteslm/ask", { workspace_id: workspaceId, query });
      const data = res?.data?.data;
      const assistant = data?.answer || "";
      setAnswer(assistant);
      let assistantMeta: any = { tools: { mindmap: false } };
      
      if (/mind\s*map|mindmap|generate a mind\s*map/i.test(query)) {
        const rawText = data?.answer || "";
        // Parse the answer to extract structured mind map data
        const lines: string[] = rawText.split(/\n+/).filter(Boolean);
        type ParsedNode = { id: string; text: string; type: 'category'|'item'|'main'; children?: Array<{ id: string; text: string }> };
        const nodes: ParsedNode[] = [];
        let currentCategory: ParsedNode | null = null;
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          // Main categories (usually marked with #, ##, or bold formatting)
          if (trimmed.match(/^#+\s/) || trimmed.match(/^\*\*.*\*\*/) || trimmed.match(/^[A-Z][^a-z]*:$/)) {
            const text = trimmed.replace(/^#+\s/, '').replace(/\*\*/g, '').replace(/:$/, '');
            currentCategory = { 
              id: `cat-${nodes.length}`, 
              text: text,
              type: 'category',
              children: []
            };
            nodes.push(currentCategory);
          }
          // Sub-items (bullet points, numbered items)
          else if (trimmed.match(/^[-•*]\s/) || trimmed.match(/^\d+\.\s/)) {
            const text = trimmed.replace(/^[-•*]\s/, '').replace(/^\d+\.\s/, '');
            const item: { id: string; text: string } = {
              id: `item-${nodes.length}-${currentCategory?.children?.length || 0}`,
              text: text.length > 50 ? text.substring(0, 47) + '...' : text,
            };
            
            if (currentCategory) {
              if (!currentCategory.children) currentCategory.children = [];
              currentCategory.children.push(item);
            } else {
              nodes.push({ id: item.id, text: item.text, type: 'item' });
            }
          }
          else if (trimmed.length > 0 && !currentCategory) {
            nodes.push({
              id: `node-${nodes.length}`,
              text: trimmed.length > 60 ? trimmed.substring(0, 57) + '...' : trimmed,
              type: 'main'
            });
          }
        }
        
        // Limit total nodes to prevent clutter
         const limitedNodes = nodes.slice(0, 12);
         const payload = {
           title: `Mind Map: ${query.substring(0, 30)}...`,
           nodes: limitedNodes.map((n: any) => (typeof n === 'string' ? n : { id: n.id, text: n.text, type: n.type })),
           query: query
         } as any;
         setMindmapData(payload);
         assistantMeta = { tools: { mindmap: true }, mindmap: payload };
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: assistant, metadata: assistantMeta }]);

      try {
        await api.post('/ai/chat/exchange', {
          type: 'studio',
          page_id: studioPageId ?? null,
          user: query,
          assistant,
          assistant_metadata: assistantMeta,
        }, { requiresAuth: true });
      } catch {}
    } catch (error) {
      console.error("Error asking question:", error);
      setAnswer("Sorry, I encountered an error while processing your question. Please try again.");
    } finally {
      setIsLoading(false);
      setQuery("");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (input?.files && input.files[0] && workspaceId) {
      try {
        setIsUploading(true);
        
        const fd = new FormData();
        fd.append("workspace_id", workspaceId.toString());
        fd.append("file", input.files[0]);
        
        await api.post("/noteslm/files", fd);
        await loadDocs();
        input.value = "";
      } catch (error) {
        console.error("Error uploading file:", error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploaded": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "indexed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed": return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleMindmapCardClick = () => {
    setIsMindmapCanvasOpen(true);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const renderMessageContent = useCallback((text: string) => {
    const parts = text.split(/(\[doc:[^\]]+\])/g);
    return (
      <span className="whitespace-pre-wrap">
        {parts.map((p, i) => {
          const m = p.match(/^\[doc:([^\s\]]+)(?:\s+p:(\d+))?\]$/);
          if (m) {
            const docId = m[1];
            const page = m[2];
            return (
              <span key={i} className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 align-baseline">
                ref:{docId}{page ? ` p:${page}` : ""}
              </span>
            );
          }
          return <span key={i}>{p}</span>;
        })}
      </span>
    );
  }, []);

  if (workspaceId === null) {
    return (
      <div className="-m-4 md:-m-6 h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Setting up your Knowledge Studio</h2>
            <p className="text-muted-foreground mb-4">
              Preparing your workspace for AI-powered document analysis
            </p>
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="-m-4 md:-m-6 h-[calc(100vh-4rem)] flex bg-background">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Panel - Sources */}
        {leftPanelOpen && (
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <div className="h-full flex flex-col border-r bg-muted/20">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-background/50">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <h2 className="font-semibold">Sources</h2>
                </div>
                <div className="flex items-center space-x-1">
                  <Button size="sm" variant="ghost" onClick={loadDocs}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setLeftPanelOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Upload Area */}
              <div className="p-4 border-b">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-primary/20 hover:border-primary/40 rounded-xl p-6 transition-colors text-center">
                    <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium mb-1">Add files</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, TXT, MD, HTML
                    </p>
                  </div>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md,.html"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </div>

              {/* Documents List */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {docs.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No sources yet</p>
                    </div>
                  ) : (
                    docs.map((doc) => (
                       <div key={doc.id} className="group flex items-center space-x-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {getStatusIcon(doc.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" title={doc.original_filename}>
                              {doc.original_filename}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(doc.size_bytes)}
                            </p>
                          </div>
                        </div>
                         <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                           onClick={async () => {
                             try {
                               await api.delete(`/noteslm/files/${doc.id}`);
                               await loadDocs();
                             } catch (e) {
                               console.error('Delete failed', e);
                             }
                           }}
                         >
                           <Trash2 className="h-3 w-3" />
                         </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>
        )}
        
        {leftPanelOpen && <ResizableHandle />}

        {/* Center Panel - Chat */}
        <ResizablePanel defaultSize={75} minSize={60}>
          <div className="h-full flex flex-col">
            {/* Top Controls */}
            <div className="flex items-center justify-between p-4 border-b bg-background/50">
              <div className="flex items-center space-x-2">
                {!leftPanelOpen && (
                  <Button size="sm" variant="ghost" onClick={() => setLeftPanelOpen(true)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <h1 className="font-semibold">Chat</h1>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {docs.length} source{docs.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>

            {/* Chat Content */}
            <div className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 p-6">
                {messages.length > 0 ? (
                  <div className="max-w-4xl mx-auto space-y-3">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/30'} rounded-2xl px-4 py-2 max-w-[85%] text-sm`}>
                          {renderMessageContent(m.content)}
                        </div>
                      </div>
                    ))}
                     {mindmapData && Array.isArray(mindmapData.nodes) && mindmapData.nodes.length > 0 && (
                      <div className="flex justify-start">
                         <Card className="cursor-pointer hover:bg-muted/50 transition-colors rounded-xl px-4 py-3 text-sm border-2 border-primary/20 bg-primary/5" onClick={handleMindmapCardClick}>
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <div>
                               <div className="font-medium text-primary">Mind Map Generated</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                 {(mindmapData.nodes?.length ?? 0)} nodes • Click to open interactive canvas
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted/30 rounded-2xl px-3 py-2 max-w-[85%] text-sm text-muted-foreground flex items-center gap-2">
                          <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                          Thinking...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center max-w-2xl mx-auto text-center">
                    <div>
                      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Brain className="h-8 w-8 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold mb-3">Start a conversation</h2>
                      <p className="text-muted-foreground mb-6">
                        I can help you analyze your documents, create summaries, generate mind maps and insights.
                      </p>
                      <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                          <span>"Summarize the main points"</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                          <span>"Generate a mind map about..."</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                          <span>"What are the key findings?"</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-6 border-t bg-background/50">
                <div className="max-w-4xl mx-auto">
                  <div className="relative">
                    <Textarea
                      placeholder="Ask about your documents..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          onAsk();
                        }
                      }}
                      className="pr-12 rounded-2xl border-2 resize-none min-h-[52px] max-h-32"
                      disabled={isLoading}
                    />
                    <Button 
                      onClick={onAsk} 
                      disabled={isLoading || !query.trim()}
                      size="sm"
                      className="absolute right-2 bottom-2 rounded-xl"
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Mind map canvas dialog */}
      <Dialog open={isMindmapCanvasOpen} onOpenChange={setIsMindmapCanvasOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh]">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              {mindmapData?.title || 'Mind Map Canvas'}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] rounded-xl border bg-background/50 overflow-hidden">
            {mindmapData ? (
              <MindMap data={mindmapData} />
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Brain className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Mind Map Canvas</h3>
                  <p className="text-muted-foreground">
                    Your interactive mind map will appear here
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}