// POST-style text phase of the boot ceremony (§5.7). Pure flavor — every string is original.
export function BiosScreen() {
  return (
    <div className="bios" aria-hidden="true">
      <b>DominikOS BIOS v1.0</b>{'\n'}
      Copyright (C) 2026 Dominik Machowiak{'\n\n'}
      Main Processor : Front-End Dev @ 3.0 GHz (React core){'\n'}
      Memory Testing : 640K of enthusiasm OK{'\n\n'}
      Detecting IDE drives ...{'\n'}
      &nbsp;&nbsp;C: — My Projects .......... <b>OK</b>{'\n'}
      &nbsp;&nbsp;D: — Games ................ <b>OK</b>{'\n\n'}
      Booting from C: ...{'\n'}
    </div>
  );
}
