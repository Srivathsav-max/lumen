"use client";

import { useState, useRef } from "react";
import type EditorJS from "@editorjs/editorjs";
import { ExportImportService } from "../services/export-import";
import { HTMLImportExportPlugin } from "../plugins/html-import-export";
import { MarkdownImportExportPlugin } from "../plugins/markdown-import-export";
import { PDFExportPlugin } from "../plugins/pdf-export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileText, Code, Globe, FileImage } from "lucide-react";

interface ExportMenuProps {
  editor: EditorJS | null;
  className?: string;
  onImport?: (data: any) => void;
  getTitle?: () => string;
}

export function ExportMenu({ editor, className = "", onImport, getTitle }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<'html' | 'markdown' | 'json'>('json');

  const handleExport = async (format: "html" | "markdown" | "json" | "pdf") => {
    if (!editor) return;

    setIsExporting(true);
    try {
      const data = await editor.save();
      const title = getTitle ? getTitle().replace(/[^a-zA-Z0-9-_\s]/g, '').trim() || 'Untitled' : 'notes';
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${title}-${timestamp}`;

      switch (format) {
        case "html":
          HTMLImportExportPlugin.exportToFile(data, `${filename}.html`, getTitle ? getTitle() : "Exported Document");
          break;
        case "markdown":
          MarkdownImportExportPlugin.exportToFile(data, `${filename}.md`);
          break;
        case "pdf":
          await PDFExportPlugin.exportToPDF(data, `${filename}.pdf`);
          break;
        case "json":
          const jsonContent = JSON.stringify(data, null, 2);
          ExportImportService.downloadFile(
            jsonContent,
            `${filename}.json`,
            "application/json"
          );
          break;
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = (type: 'html' | 'markdown' | 'json') => {
    setImportType(type);
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    setIsImporting(true);
    try {
      let data;
      
      switch (importType) {
        case 'html':
          data = await HTMLImportExportPlugin.importFromFile(file);
          break;
        case 'markdown':
          data = await MarkdownImportExportPlugin.importFromFile(file);
          break;
        case 'json':
          const text = await file.text();
          data = JSON.parse(text);
          break;
        default:
          throw new Error('Unsupported import type');
      }

      // Clear the editor and load new data
      await editor.clear();
      await editor.render(data);
      
      if (onImport) {
        onImport(data);
      }
      
      console.log('Import successful');
    } catch (error) {
      console.error("Import failed:", error);
      alert("Import failed. Please check the file format and try again.");
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!editor) {
    return null;
  }

  const isProcessing = isExporting || isImporting;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.md,.json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />
      
      <div className="flex gap-2">
        {/* Import Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessing}
              className={className}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleImport("html")}>
              <Globe className="h-4 w-4 mr-2" />
              Import from HTML
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleImport("markdown")}>
              <FileText className="h-4 w-4 mr-2" />
              Import from Markdown
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleImport("json")}>
              <Code className="h-4 w-4 mr-2" />
              Import from JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessing}
              className={className}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport("html")}>
              <Globe className="h-4 w-4 mr-2" />
              Export as HTML
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("markdown")}>
              <FileText className="h-4 w-4 mr-2" />
              Export as Markdown
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("pdf")}>
              <FileImage className="h-4 w-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExport("json")}>
              <Code className="h-4 w-4 mr-2" />
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
