import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { TAG_COLOR_OPTIONS, normalizeColorHex } from '@/lib/tagColors';
import { cn } from '@/lib/utils';

type TagColorPickerProps = {
  value?: string | null;
  onSelect: (colorId: string | null) => void;
  disabled?: boolean;
  allowDeselect?: boolean;
  className?: string;
  size?: 'default' | 'compact';
  customColors?: string[];
  onAddCustomColor?: (hex: string) => string | void;
};

const sizeVariants = {
  default: {
    swatch: 'h-10 w-10',
    grid: 'grid-cols-6 sm:grid-cols-8',
    gap: 'gap-2',
  },
  compact: {
    swatch: 'h-9 w-9',
    grid: 'grid-cols-6 sm:grid-cols-8',
    gap: 'gap-1.5',
  },
};

type Swatch = {
  id: string;
  value: string;
  label: string;
  isCustom?: boolean;
};

export const TagColorPicker = ({
  value,
  onSelect,
  disabled = false,
  allowDeselect = false,
  className,
  size = 'default',
  customColors = [],
  onAddCustomColor,
}: TagColorPickerProps) => {
  const { swatch, grid, gap } = sizeVariants[size];
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const [customColor, setCustomColor] = useState<string>(
    () => normalizeColorHex(value ?? TAG_COLOR_OPTIONS[0]?.value) ?? '#2563EB',
  );
  const normalizedValue = normalizeColorHex(value ?? undefined);
  const canAddCustomColor = !!normalizeColorHex(customColor);

  useEffect(() => {
    const normalized = normalizeColorHex(value ?? undefined);
    if (normalized) {
      setCustomColor(normalized);
    }
  }, [value]);

  const swatches: Swatch[] = useMemo(() => {
    const seen = new Map<string, Swatch>();
    TAG_COLOR_OPTIONS.forEach((option) => {
      const normalized = normalizeColorHex(option.value) ?? option.value;
      seen.set(option.id, {
        id: option.id,
        value: normalized,
        label: option.label,
      });
    });

    customColors.forEach((color) => {
      const normalized = normalizeColorHex(color);
      if (!normalized) return;
      const exists = Array.from(seen.values()).some(
        (entry) => normalizeColorHex(entry.value) === normalized || entry.id === normalized,
      );
      if (exists) return;
      seen.set(normalized, { id: normalized, value: normalized, label: normalized, isCustom: true });
    });

    return Array.from(seen.values());
  }, [customColors]);

  const selectColor = (colorId: string) => {
    if (disabled) return;
    const normalized = normalizeColorHex(colorId);
    if (allowDeselect) {
      const matchesSelection =
        value === colorId ||
        (normalized && normalizedValue && normalizedValue === normalized);
      if (matchesSelection) {
        onSelect(null);
        return;
      }
    }
    onSelect(colorId);
  };

  const handleCustomColorPick = (nextColor: string) => {
    if (disabled) return;
    const normalized = normalizeColorHex(nextColor);
    if (!normalized) return;
    setCustomColor(normalized);
  };

  const handleAddCustomColor = () => {
    if (disabled) return;
    const normalized = normalizeColorHex(customColor);
    if (!normalized) return;

    const alreadyExists = swatches.some((swatchEntry) => {
      const swatchHex = normalizeColorHex(swatchEntry.value);
      return swatchEntry.id === normalized || swatchHex === normalized;
    });

    const added = alreadyExists ? normalized : onAddCustomColor?.(normalized);
    selectColor(added || normalized);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className={cn('grid', grid, gap)}>
        {swatches.map((swatchEntry) => {
          const normalized = normalizeColorHex(swatchEntry.value);
          const isSelected =
            value === swatchEntry.id ||
            (normalizedValue && normalized && normalizedValue === normalized);
          return (
            <button
              key={swatchEntry.id}
              type="button"
              disabled={disabled}
              onClick={() => selectColor(swatchEntry.id)}
              className={cn(
                'relative flex items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                swatch,
                isSelected ? 'ring-2 ring-primary ring-offset-2 border-primary/60' : 'border-border hover:border-primary/60',
                disabled && 'cursor-not-allowed opacity-60 hover:border-border',
              )}
              aria-pressed={isSelected}
              aria-label={swatchEntry.label}
              title={swatchEntry.label}
            >
              <span
                className="absolute inset-1 rounded-full border border-white/60 shadow-sm"
                style={{ backgroundColor: swatchEntry.value }}
                aria-hidden
              />
              {isSelected && <span className="relative inline-flex h-2 w-2 rounded-full bg-background shadow-sm" aria-hidden />}
            </button>
          );
        })}

        <button
          type="button"
          disabled={disabled}
          onClick={() => colorInputRef.current?.click()}
          className={cn(
            'relative flex items-center justify-center rounded-full border border-dashed border-border/80 bg-muted/40 text-muted-foreground transition hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            swatch,
            disabled && 'cursor-not-allowed opacity-60 hover:border-border',
          )}
          aria-label="Pick a custom color"
        >
          <span
            className="absolute inset-1 rounded-full border border-white/40"
            style={{ backgroundColor: customColor }}
            aria-hidden
          />
          <Plus className="relative h-4 w-4" aria-hidden />
          <input
            ref={colorInputRef}
            type="color"
            className="sr-only"
            value={customColor}
            onChange={(event) => handleCustomColorPick(event.target.value)}
          />
        </button>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-9 w-9 rounded-full border border-white/60 shadow-sm"
            style={{ backgroundColor: customColor }}
            aria-hidden
          />
          <div className="leading-tight">
            <p className="text-xs font-medium text-foreground">Custom color</p>
            <p className="text-[11px] text-muted-foreground">{customColor}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={disabled || !canAddCustomColor}
          onClick={handleAddCustomColor}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            (disabled || !canAddCustomColor) && 'cursor-not-allowed opacity-60 hover:border-border hover:text-foreground',
          )}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add color
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Click a swatch to set your label color. Pick a custom tone, then hit Add color to save it.
      </p>
    </div>
  );
};
