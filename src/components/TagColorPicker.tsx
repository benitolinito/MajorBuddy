import { TAG_COLOR_OPTIONS } from '@/lib/tagColors';
import { cn } from '@/lib/utils';

type TagColorPickerProps = {
  value?: string | null;
  onSelect: (colorId: string | null) => void;
  disabled?: boolean;
  allowDeselect?: boolean;
  className?: string;
  size?: 'default' | 'compact';
};

const sizeVariants = {
  default: {
    button: 'h-10 px-3 text-sm gap-2',
    dot: 'h-4 w-4',
  },
  compact: {
    button: 'h-8 px-2.5 text-[11px] gap-2',
    dot: 'h-3 w-3',
  },
};

export const TagColorPicker = ({
  value,
  onSelect,
  disabled = false,
  allowDeselect = false,
  className,
  size = 'default',
}: TagColorPickerProps) => {
  const { button, dot } = sizeVariants[size];

  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3', className)}>
      {TAG_COLOR_OPTIONS.map((option) => {
        const isSelected = value === option.id;
        const handleClick = () => {
          if (disabled) return;
          if (isSelected && allowDeselect) {
            onSelect(null);
          } else {
            onSelect(option.id);
          }
        };
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={handleClick}
            className={cn(
              'flex items-center rounded-lg border font-medium leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              button,
              isSelected
                ? 'border-primary bg-primary/5 text-foreground focus-visible:ring-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40',
              disabled && 'cursor-not-allowed opacity-50 hover:border-border',
            )}
            aria-label={isSelected && allowDeselect ? `Remove color ${option.label}` : `Set color to ${option.label}`}
          >
            <span className={cn('shrink-0 rounded-full border border-transparent', option.accentClass, dot)} aria-hidden />
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
