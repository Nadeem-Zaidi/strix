import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type ChipProps = {
  className?: string;
  label: string;
  icon?: IconDefinition;
  onClick?: () => void;  // ← add this
};

export const Chip = ({ className = "", label, icon, onClick }: ChipProps) => {
  return (
    <div
      className={`chip ${className} ${onClick ? "chip--clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {icon && <FontAwesomeIcon icon={icon} className="chip__icon" />}
      <span className="chip__label">{label}</span>
    </div>
  );
};