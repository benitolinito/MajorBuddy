import { useEffect, useMemo, useRef, useState } from 'react';
import { Pipette, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  layout?: 'grid' | 'carousel';
  showSelectionInfo?: boolean;
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
  layout = 'grid',
  showSelectionInfo = false,
}: TagColorPickerProps) => {
  const { swatch, grid, gap } = sizeVariants[size];
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const initialColor = normalizeColorHex(value ?? TAG_COLOR_OPTIONS[0]?.value) ?? '#2563eb';
  const [customColor, setCustomColor] = useState<string>(initialColor);
  const [customColorInput, setCustomColorInput] = useState<string>(initialColor);
  const normalizedValue = normalizeColorHex(value ?? undefined);
  const normalizedCustomInput = normalizeColorHex(customColorInput);
  const canAddCustomColor = Boolean(normalizedCustomInput);
  const previewColor = normalizedCustomInput ?? customColor;
  const isCarousel = layout === 'carousel';

  useEffect(() => {
    const normalized = normalizeColorHex(value ?? undefined);
    if (normalized) {
      setCustomColor(normalized);
      setCustomColorInput(normalized);
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

  const selectedSwatch = swatches.find((swatchEntry) => {
    const normalized = normalizeColorHex(swatchEntry.value);
    return (
      value === swatchEntry.id ||
      (normalizedValue && normalized && normalizedValue === normalized)
    );
  });

  const selectColor = (colorId: string) => {
    if (disabled) return;
    const normalized = normalizeColorHex(colorId);
    if (normalized) {
      setCustomColor(normalized);
      setCustomColorInput(normalized);
    }
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
    setCustomColorInput(normalized ?? nextColor);
    if (normalized) {
      setCustomColor(normalized);
    }
  };

  const handleCustomColorInput = (nextValue: string) => {
    if (disabled) return;
    setCustomColorInput(nextValue);
    const normalized = normalizeColorHex(nextValue);
    if (normalized) {
      setCustomColor(normalized);
    }
  };

  const handleAddCustomColor = () => {
    if (disabled) return;
    const normalized = normalizeColorHex(customColorInput);
    if (!normalized) return;

    const alreadyExists = swatches.some((swatchEntry) => {
      const swatchHex = normalizeColorHex(swatchEntry.value);
      return swatchEntry.id === normalized || swatchHex === normalized;
    });

    const added = alreadyExists ? normalized : onAddCustomColor?.(normalized);
    selectColor(added || normalized);
  };

  const swatchBaseClass =
    'relative flex items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
  const swatchShapeClass = isCarousel ? 'h-12 w-12 flex-shrink-0 rounded-2xl' : swatch;
  const swatchGridClass = isCarousel
    ? 'flex gap-2 overflow-x-auto pb-1 -mx-1 px-1'
    : cn('grid', grid, gap);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Saved colors
        </p>
        <div className={swatchGridClass}>
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
                  swatchBaseClass,
                  swatchShapeClass,
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
                {isSelected && (
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full bg-background shadow-sm"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {showSelectionInfo && (
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs sm:text-sm">
          <span className="font-semibold text-foreground">
            {selectedSwatch?.label ?? (normalizedValue ?? 'No color selected')}
          </span>
          {normalizedValue && <span className="text-muted-foreground">{normalizedValue}</span>}
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-10 w-10 rounded-full border border-white/60 shadow-sm"
              style={{ backgroundColor: previewColor }}
              aria-hidden
            />
            <div className="leading-tight">
              <p className="text-xs font-medium text-muted-foreground">Custom color</p>
              <p className="text-sm font-semibold text-foreground">{previewColor}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => colorInputRef.current?.click()}
              disabled={disabled}
            >
              <Pipette className="mr-2 h-3.5 w-3.5" aria-hidden />
              Pick color
            </Button>
            <input
              ref={colorInputRef}
              type="color"
              className="sr-only"
              value={previewColor}
              onChange={(event) => handleCustomColorPick(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={customColorInput}
            onChange={(event) => handleCustomColorInput(event.target.value)}
            placeholder="#123abc"
            className="font-mono text-sm"
            disabled={disabled}
          />
          <Button
            type="button"
            onClick={handleAddCustomColor}
            disabled={disabled || !canAddCustomColor}
            className="sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Save to palette
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Saved custom colors show up with the presets above in every picker.
        </p>
      </div>
    </div>
  );
};
