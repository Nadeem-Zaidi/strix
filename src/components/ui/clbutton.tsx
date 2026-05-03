import styles from '../../module_css/clbutton.module.css';

interface CLButtonProps {
  className?: string;
  leading?: React.ReactNode;
  title: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}


export const CLButton = ({
  className,
  leading,
  title,
  trailing,
  onClick,
  size = "md",
  fullWidth = false,
}: CLButtonProps) => {
  return (
    <button
      className={`
        ${styles.clbutton}
        ${styles[`clbutton--${size}`]}
        ${fullWidth ? styles["clbutton--full"] : ""}
        ${className ?? ""}
      `}
      onClick={onClick}
    >
      {leading && <span className={styles.clbutton__leading}>{leading}</span>}
      <span className={styles.clbutton__title}>{title}</span>
      {trailing && <span className={styles.clbutton__trailing}>{trailing}</span>}
    </button>
  );
};