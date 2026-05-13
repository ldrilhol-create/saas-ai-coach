type Size = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<Size, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
};

export function UserAvatar({
  email,
  size = 'sm',
}: {
  email?: string | null;
  size?: Size;
}) {
  const initial = (email?.trim()[0] ?? '?').toUpperCase();

  return (
    <span
      aria-hidden
      className={`${SIZE_CLASS[size]} rounded-full bg-gradient-to-br from-indigo-500 via-blue-600 to-blue-800 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/30 select-none`}
    >
      {initial}
    </span>
  );
}
