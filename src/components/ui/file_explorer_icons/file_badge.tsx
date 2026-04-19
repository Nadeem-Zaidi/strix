import { EXT_CONFIG } from "../../../types";

export const FileTypeBadge = ({ ext }: { ext: string }) => {
  const cfg = EXT_CONFIG[ext] || {
    color: "#6B7280",
    bg: "#F3F4F6",
    label: ext.toUpperCase().slice(0, 4) || "FILE",
  };
  return (
    <span className="file-type-badge" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
};