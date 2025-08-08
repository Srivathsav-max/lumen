"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type EditorJS from "@editorjs/editorjs";
import { SearchService, type SearchMatch, type SearchOptions } from "../services/search-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ChevronUp, 
  ChevronDown, 
  X, 
  Search, 
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FindReplaceWidgetProps {
  editor: EditorJS | null;
  isOpen: boolean;
  onClose: () => void;
  defaultSearchText?: string;
}

export function FindReplaceWidget({ 
  editor, 
  isOpen, 
  onClose, 
  defaultSearchText = "" 
}: FindReplaceWidgetProps) {
  const [searchService, setSearchService] = useState<SearchService | null>(null);
  const [searchText, setSearchText] = useState(defaultSearchText);
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  
  // Search options
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [wholeWords, setWholeWords] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize search service
  useEffect(() => {
    if (editor && isOpen) {
      try {
        const service = new SearchService(editor);
        
        service.on('matchesChanged', (newMatches: SearchMatch[], currentIndex: number) => {
          setMatches(newMatches);
          setCurrentMatchIndex(currentIndex);
          setIsSearching(false);
        });
        
        service.on('currentMatchChanged', (match: SearchMatch | null, index: number) => {
          setCurrentMatchIndex(index);
        });
        
        setSearchService(service);
        
        // Focus search input
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 100);
        
        return () => {
          try {
            service.dispose();
          } catch (error) {
            console.warn('Error disposing search service:', error);
          }
        };
      } catch (error) {
        console.error('Error initializing search service:', error);
      }
    } else if (!isOpen && searchService) {
      try {
        searchService.dispose();
        setSearchService(null);
      } catch (error) {
        console.warn('Error disposing search service:', error);
      }
    }
  }, [editor, isOpen]);

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (!searchService || !query.trim()) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      if (searchService) {
        searchService.clearHighlights();
      }
      return;
    }

    setIsSearching(true);
    
    const options: SearchOptions = {
      caseSensitive,
      regex: useRegex,
      wholeWords,
    };

    try {
      await searchService.search(query, options);
    } catch (error) {
      console.error('Search failed:', error);
      setIsSearching(false);
    }
  }, [searchService, caseSensitive, useRegex, wholeWords]);

  // Handle search text change with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchText);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, performSearch]);

  // Handle search options change
  useEffect(() => {
    if (searchText.trim()) {
      performSearch(searchText);
    }
  }, [caseSensitive, useRegex, wholeWords, performSearch]);

  const handleNextMatch = () => {
    try {
      searchService?.nextMatch();
    } catch (error) {
      console.error('Error navigating to next match:', error);
    }
  };

  const handlePreviousMatch = () => {
    try {
      searchService?.previousMatch();
    } catch (error) {
      console.error('Error navigating to previous match:', error);
    }
  };

  const handleReplace = async () => {
    if (searchService && replaceText !== undefined) {
      try {
        await searchService.replaceCurrentMatch(replaceText);
      } catch (error) {
        console.error('Error replacing current match:', error);
      }
    }
  };

  const handleReplaceAll = async () => {
    if (searchService && replaceText !== undefined) {
      try {
        const replacedCount = await searchService.replaceAllMatches(replaceText);
        console.log(`Replaced ${replacedCount} matches`);
      } catch (error) {
        console.error('Error replacing all matches:', error);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, isReplaceField = false) => {
    switch (event.key) {
      case 'Enter':
        if (event.shiftKey) {
          handlePreviousMatch();
        } else if (isReplaceField && event.ctrlKey) {
          handleReplaceAll();
        } else if (isReplaceField) {
          handleReplace();
        } else {
          handleNextMatch();
        }
        event.preventDefault();
        break;
      case 'Escape':
        onClose();
        event.preventDefault();
        break;
      case 'F3':
        if (event.shiftKey) {
          handlePreviousMatch();
        } else {
          handleNextMatch();
        }
        event.preventDefault();
        break;
    }
  };

  if (!isOpen) return null;

  const matchInfo = matches.length > 0 
    ? `${currentMatchIndex + 1} of ${matches.length}`
    : matches.length === 0 && searchText.trim() 
      ? "No matches" 
      : "";

  return (
    <TooltipProvider>
      <div className="fixed top-4 right-4 z-50 bg-background border border-border rounded-lg shadow-lg p-4 min-w-96">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Find & Replace</span>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Row */}
        <div className="flex items-center gap-2 mb-2">
          <Collapsible open={showReplace} onOpenChange={setShowReplace}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {showReplace ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          <div className="flex-1 relative">
            <Input
              ref={searchInputRef}
              placeholder="Find"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e)}
              className="pr-16"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {isSearching ? "..." : matchInfo}
            </div>
          </div>

          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviousMatch}
                  disabled={matches.length === 0}
                  className="h-8 w-8 p-0"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous match (Shift+Enter)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextMatch}
                  disabled={matches.length === 0}
                  className="h-8 w-8 p-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next match (Enter)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Replace Row */}
        <Collapsible open={showReplace} onOpenChange={setShowReplace}>
          <CollapsibleContent>
            <div className="flex items-center gap-2 mb-3 ml-10">
              <div className="flex-1">
                <Input
                  ref={replaceInputRef}
                  placeholder="Replace"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, true)}
                />
              </div>

              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReplace}
                      disabled={matches.length === 0}
                      className="h-8 w-8 p-0"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Replace current (Enter)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReplaceAll}
                      disabled={matches.length === 0}
                      className="h-8 w-8 p-0"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Replace all (Ctrl+Enter)</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Search Options */}
        <div className="flex items-center gap-4 text-sm border-t pt-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="case-sensitive"
              checked={caseSensitive}
              onCheckedChange={(checked) => setCaseSensitive(!!checked)}
            />
            <label
              htmlFor="case-sensitive"
              className="flex items-center gap-1 cursor-pointer"
            >
              Aa
              Case sensitive
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="whole-words"
              checked={wholeWords}
              onCheckedChange={(checked) => setWholeWords(!!checked)}
            />
            <label
              htmlFor="whole-words"
              className="flex items-center gap-1 cursor-pointer"
            >
              |W|
              Whole words
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="regex"
              checked={useRegex}
              onCheckedChange={(checked) => setUseRegex(!!checked)}
            />
            <label
              htmlFor="regex"
              className="flex items-center gap-1 cursor-pointer"
            >
              .*
              Regex
            </label>
          </div>
        </div>

        {/* Keyboard shortcuts help */}
        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
          <div className="grid grid-cols-2 gap-1">
            <span>Enter: Next match</span>
            <span>Shift+Enter: Previous</span>
            <span>Ctrl+Enter: Replace all</span>
            <span>Esc: Close</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
