import type { OutputData } from "@editorjs/editorjs";
import { HTMLImportExportPlugin } from "./html-import-export";

/**
 * PDF Export Plugin for EditorJS
 * Converts EditorJS data to PDF using HTML as an intermediate format
 */
export class PDFExportPlugin {
  /**
   * Export EditorJS data to PDF using the browser's print functionality
   */
  static async exportToPDF(data: OutputData, filename: string = "document.pdf"): Promise<void> {
    // Create HTML content
    const htmlContent = this.createPrintableHTML(data);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please check your popup blocker settings.');
    }

    // Write HTML content to the new window
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load
    printWindow.onload = () => {
      // Focus the window and trigger print
      printWindow.focus();
      printWindow.print();
      
      // Close the window after printing (user can cancel)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  }

  /**
   * Export to PDF using HTML to PDF conversion (requires external library)
   * This method would require a PDF library like jsPDF or Puppeteer
   */
  static async exportToPDFAdvanced(data: OutputData, filename: string = "document.pdf"): Promise<void> {
    // For now, we'll fall back to the print method
    // In a real implementation, you could use:
    // - jsPDF with html2canvas
    // - Puppeteer (server-side)
    // - PDF-lib
    // - A server-side PDF generation service
    
    console.warn('Advanced PDF export not implemented. Using browser print instead.');
    return this.exportToPDF(data, filename);
  }

  /**
   * Create HTML content optimized for PDF printing
   */
  private static createPrintableHTML(data: OutputData): string {
    const bodyContent = HTMLImportExportPlugin.exportToHTML(data);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Export</title>
    <style>
        /* PDF Print Styles */
        @page {
            margin: 1in;
            size: A4;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            
            .page-break {
                page-break-before: always;
            }
            
            .no-break {
                page-break-inside: avoid;
            }
        }
        
        body { 
            font-family: 'Times New Roman', Times, serif; 
            font-size: 12pt;
            line-height: 1.6; 
            color: #000;
            background: white;
            margin: 0;
            padding: 0;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: #000;
            margin-top: 24pt;
            margin-bottom: 12pt;
            page-break-after: avoid;
            font-weight: bold;
        }
        
        h1 { font-size: 18pt; }
        h2 { font-size: 16pt; }
        h3 { font-size: 14pt; }
        h4 { font-size: 13pt; }
        h5 { font-size: 12pt; }
        h6 { font-size: 11pt; }
        
        p { 
            margin: 0 0 12pt 0;
            text-align: justify;
        }
        
        blockquote { 
            border-left: 3pt solid #ccc; 
            margin: 12pt 0; 
            padding-left: 12pt; 
            font-style: italic; 
            color: #333;
            page-break-inside: avoid;
        }
        
        code { 
            background: #f5f5f5; 
            padding: 2pt 4pt; 
            border-radius: 2pt; 
            font-family: 'Courier New', Courier, monospace;
            font-size: 10pt;
        }
        
        pre { 
            background: #f8f8f8; 
            padding: 12pt; 
            border-radius: 4pt; 
            overflow: visible;
            page-break-inside: avoid;
            border: 1pt solid #ddd;
        }
        
        pre code {
            background: none;
            padding: 0;
            font-size: 10pt;
        }
        
        table { 
            border-collapse: collapse; 
            width: 100%; 
            margin: 12pt 0;
            page-break-inside: avoid;
        }
        
        th, td { 
            border: 1pt solid #333; 
            padding: 6pt; 
            text-align: left; 
            vertical-align: top;
        }
        
        th { 
            background-color: #f0f0f0; 
            font-weight: bold;
        }
        
        img { 
            max-width: 100%; 
            height: auto; 
            page-break-inside: avoid;
        }
        
        figure { 
            margin: 12pt 0; 
            text-align: center;
            page-break-inside: avoid;
        }
        
        figcaption { 
            font-size: 10pt; 
            color: #666; 
            text-align: center; 
            margin-top: 6pt; 
            font-style: italic;
        }
        
        ul, ol { 
            margin: 12pt 0; 
            padding-left: 24pt; 
        }
        
        .checklist { 
            list-style: none; 
            padding-left: 0;
        }
        
        .checklist li {
            margin: 6pt 0;
        }
        
        .checklist input { 
            margin-right: 6pt; 
        }
        
        li {
            margin: 3pt 0;
        }
        
        hr { 
            border: none; 
            border-top: 1pt solid #333; 
            margin: 24pt 0;
            page-break-after: avoid;
        }
        
        hr.star { 
            border: none; 
            text-align: center; 
            margin: 24pt 0;
        }
        
        hr.star::before { 
            content: "⭐ ⭐ ⭐"; 
            color: #333;
        }
        
        /* Ensure good page breaks */
        h1, h2, h3 {
            page-break-after: avoid;
        }
        
        p, blockquote, pre, table {
            orphans: 2;
            widows: 2;
        }
        
        /* Hide elements that shouldn't appear in PDF */
        .no-print {
            display: none !important;
        }
    </style>
</head>
<body>
    <div class="document-content">
        ${bodyContent}
    </div>
</body>
</html>`;
  }

  /**
   * Generate PDF using jsPDF (requires jsPDF library to be installed)
   * This is an example implementation - you'd need to install jsPDF
   */
  static async exportToPDFWithJsPDF(data: OutputData, filename: string = "document.pdf"): Promise<void> {
    try {
      // This would require jsPDF to be installed: npm install jspdf html2canvas
      // const jsPDF = (await import('jspdf')).default;
      // const html2canvas = (await import('html2canvas')).default;
      
      throw new Error('jsPDF integration not implemented. Install jsPDF and html2canvas libraries to use this feature.');
      
      /*
      // Example implementation with jsPDF:
      const pdf = new jsPDF();
      const htmlContent = this.createPrintableHTML(data);
      
      // Create a temporary element
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.width = '210mm'; // A4 width
      tempDiv.style.padding = '20mm';
      document.body.appendChild(tempDiv);
      
      // Convert to canvas
      const canvas = await html2canvas(tempDiv);
      const imgData = canvas.toDataURL('image/png');
      
      // Add to PDF
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Clean up
      document.body.removeChild(tempDiv);
      
      // Download
      pdf.save(filename);
      */
      
    } catch (error) {
      console.error('PDF export with jsPDF failed:', error);
      // Fall back to browser print
      return this.exportToPDF(data, filename);
    }
  }

  /**
   * Export to PDF using a server-side service
   * This would require a backend endpoint that accepts HTML and returns PDF
   */
  static async exportToPDFServerSide(
    data: OutputData, 
    filename: string = "document.pdf",
    serverEndpoint: string = "/api/generate-pdf"
  ): Promise<void> {
    try {
      const htmlContent = this.createPrintableHTML(data);
      
      const response = await fetch(serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: htmlContent,
          filename: filename,
          options: {
            format: 'A4',
            margin: {
              top: '1in',
              right: '1in',
              bottom: '1in',
              left: '1in'
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Server-side PDF export failed:', error);
      // Fall back to browser print
      return this.exportToPDF(data, filename);
    }
  }

  /**
   * Get PDF export options
   */
  static getPDFExportOptions(): Array<{
    name: string;
    description: string;
    method: (data: OutputData, filename?: string) => Promise<void>;
  }> {
    return [
      {
        name: "Browser Print",
        description: "Use browser's built-in print-to-PDF functionality",
        method: (data, filename) => this.exportToPDF(data, filename)
      },
      {
        name: "Advanced PDF",
        description: "Advanced PDF generation (requires additional setup)",
        method: (data, filename) => this.exportToPDFAdvanced(data, filename)
      },
      {
        name: "Server-side PDF",
        description: "Generate PDF on server (requires backend implementation)",
        method: (data, filename) => this.exportToPDFServerSide(data, filename)
      }
    ];
  }
}
