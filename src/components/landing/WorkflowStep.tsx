import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkflowStepProps = {
  index: number;
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
};

export const WorkflowStep = ({ index, title, description, icon: Icon, className }: WorkflowStepProps) => (
  <li className={cn('rounded-2xl border border-border bg-card/70 p-5 shadow-sm backdrop-blur', className)}>
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
        {String(index + 1).padStart(2, '0')}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p className="mt-2 text-base text-muted-foreground">{description}</p>
      </div>
    </div>
  </li>
);
