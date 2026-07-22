interface Props {
  onRestart: () => void; // → login (not full boot), §0.5
}

export function ShutdownScreen({ onRestart }: Props) {
  return (
    <div className="shutdown">
      <div className="shutdown__panel">
        <img src="/os/ui/start-flag.svg" alt="" />
        <h1>It's now safe to close this tab.</h1>
        <p>Thanks for visiting DominikOS. The classic portfolio is always available too.</p>
        <div className="shutdown__actions">
          <button type="button" onClick={onRestart}>⟳ Restart</button>
          <a href="/">Exit to classic site</a>
          <a href="/os/?boot=chooser">Back to start screen</a>
        </div>
      </div>
    </div>
  );
}
