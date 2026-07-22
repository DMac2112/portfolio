import { useClock } from '../hooks/useClock';

const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const DATE = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Live tray clock, h:mm AM/PM, hover tooltip = full date (§5.5). */
export function Clock() {
  const now = useClock();
  return (
    <span className="tray__clock" title={DATE.format(now)}>
      {TIME.format(now)}
    </span>
  );
}
