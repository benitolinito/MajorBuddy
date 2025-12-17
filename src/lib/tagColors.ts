const TAG_COLORS = [
  'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100',
  'border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-500/40 dark:bg-purple-500/10 dark:text-purple-100',
  'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100',
  'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-100',
  'border-pink-200 bg-pink-100 text-pink-800 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-pink-100',
  'border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-100',
];

const hashLabel = (value: string) => value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

export const getTagColorClasses = (label: string) => {
  if (!label) return TAG_COLORS[0];
  const index = Math.abs(hashLabel(label)) % TAG_COLORS.length;
  return TAG_COLORS[index];
};
