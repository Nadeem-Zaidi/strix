export const MenuIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 2L12 12M12 2L2 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect y="1.5" width="14" height="1.5" rx="0.75" fill="currentColor" />
      <rect y="6" width="14" height="1.5" rx="0.75" fill="currentColor" />
      <rect y="10.5" width="14" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );