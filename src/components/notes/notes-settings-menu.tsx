"use client";

import { useState } from "react";
import type EditorJS from "@editorjs/editorjs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Settings, 
  Search, 
  Download, 
  Upload, 
  FileText, 
  Code, 
  Globe, 
  FileImage 
} from "lucide-react";

interface NotesSettingsMenuProps {
  editor: EditorJS | null;
  onOpenFindReplace: () => void;
  onExport?: (format: "html" | "markdown" | "json" | "pdf") => void;
  onImport?: (type: 'html' | 'markdown' | 'json') => void;
  className?: string;
}

export function NotesSettingsMenu({ 
  editor, 
  onOpenFindReplace, 
  onExport,
  onImport,
  className = "" 
}: NotesSettingsMenuProps) {

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${className}`}
          title="Notes Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Find & Replace */}
        <DropdownMenuItem onClick={onOpenFindReplace}>
          <Search className="h-4 w-4 mr-2" />
          Find & Replace
          <span className="ml-auto text-xs text-muted-foreground">Ctrl+F</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Export Options */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Download className="h-4 w-4 mr-2" />
            Export
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => onExport?.("html")}>
              <Globe className="h-4 w-4 mr-2" />
              Export as HTML
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.("markdown")}>
              <FileText className="h-4 w-4 mr-2" />
              Export as Markdown
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport?.("pdf")}>
              <FileImage className="h-4 w-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onExport?.("json")}>
              <Code className="h-4 w-4 mr-2" />
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        {/* Import Options */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => onImport?.("html")}>
              <Globe className="h-4 w-4 mr-2" />
              Import from HTML
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onImport?.("markdown")}>
              <FileText className="h-4 w-4 mr-2" />
              Import from Markdown
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onImport?.("json")}>
              <Code className="h-4 w-4 mr-2" />
              Import from JSON
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
