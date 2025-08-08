"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useAI, usePageAI } from "@/providers/ai-provider";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Bot, Plus, Sparkles, ChevronDown, Send, Clock } from "lucide-react";
import { usePathname } from "next/navigation";

type AskResult = {
  text?: string;
  blocks?: Array<{ type: string; data: any }>;
};

export function AIChatMenu() {
  const { ask, isGenerating } = useAI();
  const [pageId, setPageId] = useState<string | undefined>(undefined);
  const { messages } = usePageAI(pageId);
  const [serverHistory, setServerHistory] = useState<Array<{ role: "user"|"assistant"; content: string }>>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const historyLoadedFor = useRef<string | null>(null);
  const [question, setQuestion] = useState("");
  const [last, setLast] = useState<AskResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const hasPreview = !!(last?.blocks?.length || last?.text);
  const history = useMemo(() => messages.filter(m => m.role === 'user').slice(-5), [messages]);


  const getCurrentPageId = useCallback(async (): Promise<string | null> => {
    try {
      const ctx = await (window as any)?.lumenGetEditorContext?.();
      if (ctx?.page_id) {
        return String(ctx.page_id);
      }
    } catch (error) {
    }

    try {
      const workspaceKeys = Object.keys(localStorage).filter(key => key.startsWith('lumen-current-page-'));
      if (workspaceKeys.length > 0) {
        const lastWorkspaceKey = workspaceKeys[workspaceKeys.length - 1];
        const storedPageId = localStorage.getItem(lastWorkspaceKey);
        if (storedPageId) {
          return storedPageId;
        }
      }
    } catch (error) {
      // Silent fallback
    }

    // Method 3: Try URL params if we're in a notes route
    try {
      const url = new URL(window.location.href);
      if (url.pathname.includes('/dashboard/notes')) {
        const searchParams = url.searchParams;
        const urlPageId = searchParams.get('page') || searchParams.get('pageId');
        if (urlPageId) {
          return urlPageId;
        }
      }
    } catch (error) {
      // Silent fallback
    }

    // Method 4: Use existing state if available
    if (pageId) {
      return pageId;
    }

    return null;
  }, [pageId]);

  const pathname = usePathname();
  useEffect(() => {
    let mounted = true;
    
    const initializePageContext = async () => {
      try {
        const detectedPageId = await getCurrentPageId();
        if (mounted && detectedPageId && detectedPageId !== pageId) {
          setPageId(detectedPageId);
        }
      } catch (error) {
        // Silent fallback
      }
    };
    
    initializePageContext();
    
    // Also listen for page changes
    const handlePageSelected = (event: Event) => {
      const customEvent = event as CustomEvent<{ workspaceId: number; pageId: string }>;
      const { pageId: newPageId } = customEvent.detail || {};
      if (newPageId && String(newPageId) !== pageId) {
        setPageId(String(newPageId));
      }
    };

    // Defer KaTeX CSS loading until the dropdown is opened
    
    if (typeof window !== 'undefined') {
      window.addEventListener('lumen:notes-page-selected', handlePageSelected as EventListener);
    }
    
    // Avoid autofocus to reduce LCP work
    
    return () => {
      mounted = false;
       if (typeof window !== 'undefined') {
         window.removeEventListener('lumen:notes-page-selected', handlePageSelected as EventListener);
       }
    };
  }, [pathname, pageId, getCurrentPageId]);

  // Fetch server history when dropdown opens and pageId is known
  useEffect(() => {
    const load = async () => {
      if (!isOpen || !pageId) return;
      if (historyLoadedFor.current === pageId) return;
      
      setIsLoadingHistory(true);
      
      try {
        // Load KaTeX CSS only when we actually open the conversation
        try {
          if (typeof window !== 'undefined' && !document.getElementById('katex-css')) {
            const link = document.createElement('link');
            link.id = 'katex-css';
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css';
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
          }
        } catch {}

        const historyUrl = `/ai/chat/history?type=notes&page_id=${encodeURIComponent(pageId)}`;
        const res = await api.get<{ data: Array<{ role: "user"|"assistant"; content: string }> }>(historyUrl);
        const items = (res.data as any)?.data as Array<{ role: "user"|"assistant"; content: string }> | undefined;
        
        if (items && Array.isArray(items)) {
          setServerHistory(items);
          historyLoadedFor.current = pageId;
        } else {
          setServerHistory([]);
          historyLoadedFor.current = pageId;
        }
      } catch (error) {
        setServerHistory([]);
        historyLoadedFor.current = pageId;
      } finally {
        setIsLoadingHistory(false);
      }
    };
    load();
  }, [isOpen, pageId]);

  useEffect(() => {
    if (!isOpen || pageId) return;
    
    let canceled = false;
    let attempts = 0;
    const tryResolve = async () => {
      try {
        const detectedPageId = await getCurrentPageId();
        if (!canceled && detectedPageId) {
          setPageId(detectedPageId);
        }
      } catch (error) {
      }
    };
    
    const timer = setInterval(() => {
      attempts += 1;
      if (attempts > 10) {
        clearInterval(timer);
        return;
      }
      tryResolve();
    }, 250);
    
    return () => {
      canceled = true;
      clearInterval(timer);
    };
  }, [isOpen, pageId, getCurrentPageId]);


  const runAsk = useCallback(async () => {
    if (!question.trim()) return;
    
    setIsOpen(true);
    
    const currentPageId = await getCurrentPageId();
    
    if (currentPageId && currentPageId !== pageId) {
      setPageId(currentPageId);
    }

    if (!currentPageId) {
      alert('Please make sure you are in a notes page before using AI chat.');
      setIsOpen(false);
      return;
    }

    const ctx = await (window as any)?.lumenGetEditorContext?.();

    const { text, actions } = await ask(question, {
      context: {
        ...ctx,
        page_id: currentPageId,
        chat_type: "notes",
      },
      formatHint: "markdown for EditorJS",
    });

    const insertAction = actions?.find((a: any) => a.type === "insert_editorjs_blocks");
    if (insertAction?.payload?.blocks) {
      setLast({ blocks: insertAction.payload.blocks });
    } else {
      setLast({ text });
    }
    
    historyLoadedFor.current = null;
    setServerHistory([]);
    
    setQuestion("");
  }, [ask, question, pageId, getCurrentPageId]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      runAsk();
    }
  }, [runAsk]);

  const selectFromHistory = useCallback((historyQuestion: string) => {
    setQuestion(historyQuestion);
    setShowHistory(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const decodeHtmlEntities = useCallback((text: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }, []);

  // Content processing utilities (same as notes editor)
  const isHtmlContent = useCallback((text: string): boolean => {
    return /<\/?[a-zA-Z][^>]*>/.test(text);
  }, []);

  const hasMarkdownFormatting = useCallback((text: string): boolean => {
    return /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(__[^_]+__)|(_[^_]+_)|(~~[^~]+~~)|(\$\$[^$]+\$\$)|(\\\\\[[^\\]]+\\\\\])/.test(text);
  }, []);

  const processMathExpressions = useCallback((text: string): string => {
    const encodeForAttribute = (text: string): string => {
      return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    const mathPatterns = [
      { regex: /\$\$([^$]+)\$\$/g, placeholder: (match: string) => `<span class="math-display" data-math="${encodeForAttribute(match.slice(2, -2))}">${match}</span>` },
      { regex: /\$([^$]+)\$/g, placeholder: (match: string) => `<span class="math-inline" data-math="${encodeForAttribute(match.slice(1, -1))}">${match}</span>` },
      { regex: /\\\\\[([^\\]]+)\\\\\]/g, placeholder: (match: string) => `<span class="math-display" data-math="${encodeForAttribute(match.slice(2, -2))}">${match}</span>` }
    ];

    let result = text;
    for (const pattern of mathPatterns) {
      result = result.replace(pattern.regex, pattern.placeholder);
    }
    
    return result;
  }, []);

  const processMarkdownToHtml = useCallback((text: string): string => {
    if (!text) return "";
    
    // First process math expressions to avoid conflicts with markdown
    let processedText = processMathExpressions(text);
    
    processedText = processedText
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')         // **bold**
      .replace(/\*([^*]+)\*/g, '<i>$1</i>')             // *italic*
      .replace(/__([^_]+)__/g, '<b>$1</b>')             // __bold__
      .replace(/_([^_]+)_/g, '<i>$1</i>')               // _italic_
      .replace(/~~([^~]+)~~/g, '<s>$1</s>')             // ~~strikethrough~~
      .replace(/`([^`]+)`/g, '<code>$1</code>')         // `code`
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'); // [text](url)
    
    return processedText;
  }, [processMathExpressions]);

  const smartSanitizeAndProcessText = useCallback((text: string): string => {
    if (!text) return "";
    
    // If it already contains HTML tags, treat it as HTML but clean up encoding
    if (isHtmlContent(text)) {
      return text
        .replace(/&amp;lt;/g, '&lt;')
        .replace(/&amp;gt;/g, '&gt;')
        .replace(/&amp;quot;/g, '&quot;')
        .replace(/&amp;#39;/g, '&#39;')
        .replace(/&amp;amp;/g, '&amp;')
        .trim();
    }
    
    if (hasMarkdownFormatting(text)) {
      return processMarkdownToHtml(text);
    }
    
    return decodeHtmlEntities(text);
  }, [isHtmlContent, hasMarkdownFormatting, processMarkdownToHtml, decodeHtmlEntities]);

  const renderMathInElement = useCallback(async (element: HTMLElement): Promise<void> => {
    try {
      const { renderMathInElement: renderMath } = await import('@/components/editor/utils/katex-renderer');
      await renderMath(element, {
        throwOnError: false,
        errorColor: '#cc0000',
        output: 'htmlAndMathml'
      });
    } catch (error) {
      const mathElements = element.querySelectorAll('.math-display, .math-inline');
      mathElements.forEach(mathEl => {
        const mathContent = mathEl.getAttribute('data-math');
        if (mathContent) {
          const span = document.createElement('span');
          span.textContent = mathContent;
          span.style.fontFamily = 'monospace';
          span.style.backgroundColor = '#f5f5f5';
          span.style.padding = '2px 4px';
          span.style.borderRadius = '3px';
          if (mathEl.classList.contains('math-display')) {
            span.style.display = 'block';
            span.style.textAlign = 'center';
            span.style.margin = '10px 0';
          }
          mathEl.parentNode?.replaceChild(span, mathEl);
        }
      });
    }
  }, []);

  // Message content component with processing and math rendering
  function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
    const messageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!isUser && messageRef.current) {
        const processAndRender = async () => {
          try {
            const processedContent = smartSanitizeAndProcessText(content);
            if (isHtmlContent(processedContent) || hasMarkdownFormatting(processedContent)) {
              messageRef.current!.innerHTML = processedContent;
              await renderMathInElement(messageRef.current!);
            } else {
              messageRef.current!.textContent = processedContent;
            }
          } catch (error) {
            console.warn('Error processing message content:', error);
            messageRef.current!.textContent = content;
          }
        };
        processAndRender();
      }
    }, [content, isUser]);

    if (isUser) {
      return <div className="whitespace-pre-wrap [content-visibility:auto] [contain-intrinsic-size:0 200px]">{content}</div>;
    }

    return <div ref={messageRef} className="whitespace-pre-wrap [content-visibility:auto] [contain-intrinsic-size:0 200px]" />;
  }

  const addToNotes = useCallback(async () => {
    if (!last) return;
    
    // Prefer structured blocks
    if (last.blocks && last.blocks.length) {
      // Process and sanitize blocks using enhanced content processing
      const processedBlocks = last.blocks.map((block: any) => ({
        ...block,
        data: {
          ...block.data,
          ...(block.data.text && { text: smartSanitizeAndProcessText(block.data.text) }),
          ...(block.data.code && { code: decodeHtmlEntities(block.data.code) }), // Code should remain plain text
          ...(block.data.caption && { caption: smartSanitizeAndProcessText(block.data.caption) }),
          // Handle list items
          ...(Array.isArray(block.data.items) && {
            items: block.data.items.map((item: any) => 
              typeof item === 'string' 
                ? smartSanitizeAndProcessText(item)
                : typeof item === 'object' && item.text
                ? { ...item, text: smartSanitizeAndProcessText(item.text) }
                : item
            )
          }),
          // Handle table content
          ...(Array.isArray(block.data.content) && {
            content: block.data.content.map((row: any[]) => 
              Array.isArray(row) 
                ? row.map((cell) => typeof cell === 'string' ? smartSanitizeAndProcessText(cell) : cell)
                : row
            )
          })
        }
      }));
      
      window.dispatchEvent(
        new CustomEvent("lumen:ai-insert-blocks", { detail: { blocks: processedBlocks } })
      );
      return;
    }
    
    // Convert markdown/plain text to blocks on the client, then insert
    if (last.text && last.text.trim()) {
      try {
        // Use enhanced content processing
        const processedText = smartSanitizeAndProcessText(last.text);
        const mod = await import("@/components/editor/plugins/markdown-import-export");
        const data = await mod.MarkdownImportExportPlugin.importFromMarkdown(processedText);
        const blocks = (data?.blocks ?? []).map((b: any) => ({ type: b.type, data: b.data }));
        
        if (blocks.length > 0) {
          window.dispatchEvent(
            new CustomEvent("lumen:ai-insert-blocks", { detail: { blocks } })
          );
        } else {
          window.dispatchEvent(
            new CustomEvent("lumen:ai-insert", { detail: { text: processedText } })
          );
        }
      } catch (error) {
        console.warn('Error processing AI content for notes:', error);
        // Fallback to basic processing
        window.dispatchEvent(
          new CustomEvent("lumen:ai-insert", { detail: { text: smartSanitizeAndProcessText(last.text) } })
        );
      }
    }
  }, [last, smartSanitizeAndProcessText, decodeHtmlEntities]);

  // Close conversation when clicking outside or pressing Escape
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!isOpen) return;
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      {/* Compact Navbar Chat Input */}
      <div className="flex items-center bg-background/80 border rounded-full min-w-[280px] w-full shadow-sm px-1">
        <Input
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          placeholder="Ask anything and press Enter…"
          className="flex-1 border-none bg-transparent focus-visible:ring-0 text-sm py-2 px-4 h-10"
          disabled={isGenerating}
        />
        {history.length > 0 && (
          <DropdownMenu open={showHistory} onOpenChange={setShowHistory}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-muted rounded-full mr-1"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Recent queries
              </div>
              {history.map((msg, i) => (
                <DropdownMenuItem
                  key={i}
                  onClick={() => selectFromHistory(msg.content)}
                  className="cursor-pointer py-2 px-3"
                >
                  <div className="truncate text-sm">
                    {msg.content.length > 60 ? `${msg.content.slice(0, 60)}...` : msg.content}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          onClick={runAsk}
          disabled={isGenerating || !question.trim()}
          className="h-8 w-8 p-0 mr-1 rounded-full"
          size="sm"
        >
          {isGenerating ? (
            <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
          ) : (
            <Send className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Conversation Dropdown */}
      {(isOpen && (messages.length > 0 || (last?.text || (last?.blocks?.length ?? 0) > 0) || isGenerating || isLoadingHistory)) && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-background border rounded-xl shadow-xl p-4 max-h-[60vh] overflow-y-auto z-50 w-[min(720px,92vw)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="flex text-gray-500 text-sm">History</p>
            </div>
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setIsOpen(false)}>Close</Button>
          </div>

          <div className="space-y-4">

            {/* Loading history indicator */}
            {isLoadingHistory && (
              <div className="flex justify-center">
                <div className="bg-muted rounded-2xl px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                  <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                  Loading conversation history...
                </div>
              </div>
            )}

            {/* Show server history if available, otherwise fall back to provider messages */}
            {(serverHistory.length > 0 ? serverHistory : messages).map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-2xl px-3 py-2 max-w-[85%] text-sm`}>
                  <MessageContent content={m.content} isUser={m.role === 'user'} />
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-3 py-2 max-w-[85%] text-sm text-muted-foreground flex items-center gap-2">
                  <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
                  Thinking...
                </div>
              </div>
            )}

            {/* Separator for latest response */}
            {((serverHistory.length > 0 || messages.length > 0) && (last?.text || (last?.blocks?.length ?? 0) > 0)) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex-1 h-px bg-border" />
                Latest Response
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            {/* Show the latest AI response if available */}
            {last && (last.text || (last.blocks?.length ?? 0) > 0) && (
              <div className="flex justify-start">
                <div className="bg-blue-50 dark:bg-blue-950 rounded-2xl px-3 py-2 max-w-[85%] text-sm">
                  {last.text ? (
                    <MessageContent content={last.text} isUser={false} />
                  ) : (
                    <div className="text-muted-foreground">Generated structured content</div>
                  )}
                </div>
              </div>
            )}

            {/* Empty states */}
            {!isLoadingHistory && serverHistory.length === 0 && messages.length === 0 && !last && !isGenerating && (
              <div className="text-center text-muted-foreground">
                <div className="text-sm">No conversation history yet</div>
                <div className="text-xs mt-1">Start a conversation to see messages here</div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t mt-4">
            <Button onClick={addToNotes} disabled={!last} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Add to Notes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


