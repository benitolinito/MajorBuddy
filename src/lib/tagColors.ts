import type { CSSProperties } from 'react';

export type TagColorOption = {
  id: string;
  label: string;
  value: string;
  className: string;
  accentClass: string;
};

export const TAG_COLOR_OPTIONS: TagColorOption[] = [
  {
    id: 'blue',
    label: 'Blue',
    value: '#3b82f6',
    className:
      'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100',
    accentClass: 'bg-blue-500',
  },
  {
    id: 'purple',
    label: 'Purple',
    value: '#a855f7',
    className:
      'border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-100',
    accentClass: 'bg-purple-500',
  },
  {
    id: 'green',
    label: 'Green',
    value: '#10b981',
    className:
      'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100',
    accentClass: 'bg-emerald-500',
  },
  {
    id: 'orange',
    label: 'Orange',
    value: '#f97316',
    className:
      'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-100',
    accentClass: 'bg-orange-500',
  },
  {
    id: 'pink',
    label: 'Pink',
    value: '#ec4899',
    className:
      'border-pink-200 bg-pink-100 text-pink-800 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-100',
    accentClass: 'bg-pink-500',
  },
  {
    id: 'slate',
    label: 'Slate',
    value: '#64748b',
    className:
      'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-100',
    accentClass: 'bg-slate-500',
  },
];

const CUSTOM_COLOR_CLASSNAME = 'bg-card text-foreground border-border';

const hashLabel = (value: string) => value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

export const normalizeColorHex = (input?: string | null): string | null => {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const expanded = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
  return `#${expanded.toLowerCase()}`;
};

const getFallbackOption = (label: string) => {
  const safeLabel = label || 'tag';
  const index = Math.abs(hashLabel(safeLabel)) % TAG_COLOR_OPTIONS.length;
  return TAG_COLOR_OPTIONS[index];
};

const findColorOption = (colorId?: string | null) =>
  TAG_COLOR_OPTIONS.find((option) => option.id === colorId) ?? null;

const isCustomHex = (colorId?: string | null) => Boolean(normalizeColorHex(colorId ?? undefined));

const hexToRgb = (hex: string) => {
  const normalized = normalizeColorHex(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
};

const withAlpha = (hex: string, alpha: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '';
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${safeAlpha})`;
};

const getReadableTextColor = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#0f172a';
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 160 ? '#0f172a' : '#f8fafc';
};

export const getTagColorClasses = (label: string, colorId?: string | null) => {
  if (isCustomHex(colorId)) return CUSTOM_COLOR_CLASSNAME;
  const option = findColorOption(colorId) ?? getFallbackOption(label);
  return option.className;
};

export const getTagAccentClass = (label: string, colorId?: string | null) => {
  if (isCustomHex(colorId)) return '';
  const option = findColorOption(colorId) ?? getFallbackOption(label);
  return option.accentClass;
};

export const getTagColorStyle = (label: string, colorId?: string | null): CSSProperties | undefined => {
  const normalized = normalizeColorHex(colorId ?? undefined);
  if (!normalized) return undefined;
  return {
    backgroundColor: withAlpha(normalized, 0.14),
    borderColor: withAlpha(normalized, 0.35),
    color: getReadableTextColor(normalized),
  };
};

export const getTagAccentStyle = (label: string, colorId?: string | null): CSSProperties | undefined => {
  const normalized = normalizeColorHex(colorId ?? undefined);
  if (!normalized) return undefined;
  return {
    backgroundColor: withAlpha(normalized, 0.9),
  };
};

export const getDefaultColorId = (label: string) => getFallbackOption(label).id;
