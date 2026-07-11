interface Props {
  open: boolean;
  onToggle: () => void;
}

/** Green Start pill (§5.5) — label "start" (§15.2), Dominik's original DM monogram as the mark. */
export function StartButton({ open, onToggle }: Props) {
  return (
    <button
      type="button"
      className="start-btn"
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={onToggle}
    >
      <img src="/os/ui/start-flag.svg" alt="" draggable={false} />
      start
    </button>
  );
}
