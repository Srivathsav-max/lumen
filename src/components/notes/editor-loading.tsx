export function EditorLoading() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="border border-input rounded-lg bg-background p-6">
        {/* Simulate editor toolbar */}
        <div className="flex gap-2 mb-4 pb-4 border-b border-input">
          <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
          <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
          <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
          <div className="w-px bg-input mx-2"></div>
          <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
          <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
          <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
        </div>
        
        {/* Simulate editor content area */}
        <div className="space-y-4">
          <div className="h-4 bg-muted rounded animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
        </div>
        
        <div className="flex items-center justify-center mt-8 text-sm text-muted-foreground">
          Loading editor...
        </div>
      </div>
    </div>
  );
}
