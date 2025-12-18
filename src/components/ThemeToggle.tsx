import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

type ThemeToggleProps = {
  className?: string;
};

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn('relative', className)}
      aria-label={`Activate ${isDark ? 'light' : 'dark'} mode`}
    >
      <Sun className={cn('h-4 w-4 transition-transform', isDark && '-translate-y-6 opacity-0')} />
      <Moon className={cn('absolute h-4 w-4 transition-transform', isDark ? 'opacity-100' : 'translate-y-6 opacity-0')} />
    </Button>
  );
};
