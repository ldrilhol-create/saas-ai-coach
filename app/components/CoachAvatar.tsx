type CoachAvatarProps = {
  size?: number;
  className?: string;
};

let idCounter = 0;
const nextId = () => `coach-grad-${++idCounter}`;

export function CoachAvatar({ size = 40, className = '' }: CoachAvatarProps) {
  const gradId = nextId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 rounded-full shadow-lg shadow-blue-600/30 ${className}`}
      aria-label="Coach IA"
      role="img"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
      </defs>

      <circle cx="20" cy="20" r="20" fill={`url(#${gradId})`} />

      <circle cx="20" cy="16" r="6.5" fill="#f5cba0" />

      <path
        d="M13.5 16 Q13.5 9 20 9 Q26.5 9 26.5 16 Q26 14.5 24 14 Q22 13.7 20 13.7 Q18 13.7 16 14 Q14 14.5 13.5 16 Z"
        fill="#2a1810"
      />

      <ellipse cx="17.5" cy="17" rx="0.7" ry="0.9" fill="#1f1108" />
      <ellipse cx="22.5" cy="17" rx="0.7" ry="0.9" fill="#1f1108" />

      <path
        d="M18 19.5 Q20 20.5 22 19.5"
        stroke="#a06340"
        strokeWidth="0.6"
        strokeLinecap="round"
        fill="none"
      />

      <path
        d="M6 40 Q6 28.5 13 25.5 L27 25.5 Q34 28.5 34 40 Z"
        fill="#1f2937"
      />

      <path d="M16.5 25.5 L20 32 L23.5 25.5 Z" fill="#f9fafb" />

      <path
        d="M18.7 27.5 L20 30.5 L21.3 27.5 L21 36 L19 36 Z"
        fill="#dc2626"
      />
      <path
        d="M18.7 27.5 L20 30.5 L21.3 27.5 L20 28.8 Z"
        fill="#991b1b"
      />
    </svg>
  );
}
