export type TagColorOption = {
  id: string;
  label: string;
  className: string;
  accentClass: string;
};

export const TAG_COLOR_OPTIONS: TagColorOption[] = [
  {
    id: 'blue',
    label: 'Blue',
    className:
      'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100',
    accentClass: 'bg-blue-500',
  },
  {
    id: 'purple',
    label: 'Purple',
    className:
      'border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-100',
    accentClass: 'bg-purple-500',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    className:
      'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100',
    accentClass: 'bg-emerald-500',
  },
  {
    id: 'orange',
    label: 'Orange',
    className:
      'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-100',
    accentClass: 'bg-orange-500',
  },
  {
    id: 'pink',
    label: 'Pink',
    className:
      'border-pink-200 bg-pink-100 text-pink-800 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-100',
    accentClass: 'bg-pink-500',
  },
  {
    id: 'slate',
    label: 'Slate',
    className:
      'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-100',
    accentClass: 'bg-slate-500',
  },
];

const hashLabel = (value: string) => value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

const getFallbackOption = (label: string) => {
  const safeLabel = label || 'tag';
  const index = Math.abs(hashLabel(safeLabel)) % TAG_COLOR_OPTIONS.length;
  return TAG_COLOR_OPTIONS[index];
};

const findColorOption = (colorId?: string | null) =>
  TAG_COLOR_OPTIONS.find((option) => option.id === colorId);

export const getTagColorClasses = (label: string, colorId?: string | null) => {
  const option = findColorOption(colorId) ?? getFallbackOption(label);
  return option.className;
};

export const getTagAccentClass = (label: string, colorId?: string | null) => {
  const option = findColorOption(colorId) ?? getFallbackOption(label);
  return option.accentClass;
};

export const getDefaultColorId = (label: string) => getFallbackOption(label).id;
