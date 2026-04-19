import { EXT_CONFIG } from "../../../types";


export const FileIcon = ({ ext, size = 20 }: { ext: string; size?: number }) => {
  const cfg = EXT_CONFIG[ext] || { color: "#9CA3AF", bg: "#F3F4F6", label: "" };
  return (
    <svg width={size * 0.85} height={size} viewBox="0 0 17 20" fill="none">
      <rect x="0.5" y="0.5" width="16" height="19" rx="2.5" fill="white" stroke="#E5E7EB" />
      <path
        d="M10.5 0.5L16.5 6.5H11C10.72 6.5 10.5 6.28 10.5 6V0.5Z"
        fill={cfg.bg}
        stroke="#E5E7EB"
        strokeWidth="0.5"
      />
      <rect x="3" y="9" width="11" height="1" rx="0.5" fill={cfg.color} opacity="0.35" />
      <rect x="3" y="11.5" width="8" height="1" rx="0.5" fill={cfg.color} opacity="0.25" />
      <rect x="3" y="14" width="5" height="1" rx="0.5" fill={cfg.color} opacity="0.15" />
    </svg>
  );
};