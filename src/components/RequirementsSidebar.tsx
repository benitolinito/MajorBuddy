interface RequirementsProps {
  totalCredits: number;
  maxCredits: number;
  majorCore: number;
  maxMajorCore: number;
  genEd: number;
  maxGenEd: number;
}

export const RequirementsSidebar = ({
  totalCredits,
  maxCredits,
  majorCore,
  maxMajorCore,
  genEd,
  maxGenEd,
}: RequirementsProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6">
      <h3 className="font-semibold text-foreground mb-3">Requirements</h3>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Total Credits</span>
            <span className="font-medium text-foreground">{totalCredits}/{maxCredits}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min((totalCredits / maxCredits) * 100, 100)}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Major Core</span>
            <span className="font-medium text-foreground">{majorCore}/{maxMajorCore}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-category-core rounded-full transition-all"
              style={{ width: `${Math.min((majorCore / maxMajorCore) * 100, 100)}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Gen Ed</span>
            <span className="font-medium text-foreground">{genEd}/{maxGenEd}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-category-gened rounded-full transition-all"
              style={{ width: `${Math.min((genEd / maxGenEd) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};