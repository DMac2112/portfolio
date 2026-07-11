// Login (§5.7): blue split screen, single user tile. Clicking the tile is also the user
// gesture that unlocks WebAudio for the logon chime (sound stays opt-in).
import { useSystem } from '../context/SystemContext';
import { sound } from '../sound';

interface Props {
  onLogin: () => void;
  onShutDown: () => void;
}

export function LoginScreen({ onLogin, onShutDown }: Props) {
  const { prefs } = useSystem();
  return (
    <div className="login">
      <div className="login__band login__band--top" />
      <div className="login__center">
        <div className="login__brand">
          <img src="/os/ui/start-flag.svg" alt="" />
          <h1>
            Dominik<i>OS</i>
          </h1>
          <p>To begin, click your user name</p>
        </div>
        <div className="login__divider" aria-hidden="true" />
        <button
          type="button"
          className="login__tile"
          onClick={() => {
            if (!prefs.muted) sound.logon();
            onLogin();
          }}
        >
          <img src="/os/ui/avatar.svg" alt="" />
          <span>
            <strong>Dominik Machowiak</strong>
            <small>Front-end · Salesforce Marketing Cloud Dev</small>
          </span>
        </button>
      </div>
      <div className="login__band login__band--bottom">
        <button type="button" className="login__off" onClick={onShutDown}>
          <i>⏻</i> Turn off computer
        </button>
        <span className="login__hint" style={{ marginLeft: 'auto' }}>
          One account, no password — it's a portfolio.
        </span>
      </div>
    </div>
  );
}
