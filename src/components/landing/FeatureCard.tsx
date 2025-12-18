import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type FeatureCardProps = {
  title: string;
  description: string;
  detail?: string;
  icon: LucideIcon;
  className?: string;
};

export const FeatureCard = ({ title, description, detail, icon: Icon, className }: FeatureCardProps) => (
  <article className={cn('rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur', className)}>
    <div className="flex items-center gap-3">
      <span className="rounded-full bg-primary/10 p-2 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    </div>
    <p className="mt-3 text-base text-muted-foreground">{description}</p>
    {detail && <p className="mt-2 text-sm text-muted-foreground/90">{detail}</p>}
  </article>
);
