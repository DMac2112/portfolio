// deploy.mjs — one command to publish the whole site to dmac2112.github.io.
//
//   run:  .\deploy.cmd          (from the portfolio-rework folder)
//
// Builds the Astro site with Node 20, then pushes the built dist/ into the
// DMac2112.github.io repo, which GitHub Pages serves at the root domain.
// A reusable clone is kept at .ghio-deploy/ (gitignored) so redeploys are quick.
//
// NOTE: this publishes whatever is already vendored into public/os. If you changed
// the OS or its games, rebuild + re-vendor them first:
//   cd ../dominikos/os && npm run build && node scripts/deploy-rework.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const DEPLOY = path.join(ROOT, '.ghio-deploy');
const REPO = 'https://github.com/DMac2112/DMac2112.github.io.git';
const run = (cmd, cwd = ROOT) => execSync(cmd, { cwd, stdio: 'inherit', shell: true });

console.log('\n[1/4] Building the site (Node 20)...');
run(`"${path.join(ROOT, 'npm20.cmd')}" run build`);
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('x build produced no dist/index.html - aborting.');
  process.exit(1);
}

console.log('\n[2/4] Syncing the deploy repo...');
let cloned = false;
if (fs.existsSync(path.join(DEPLOY, '.git'))) {
  try {
    run('git fetch origin', DEPLOY);
    run('git reset --hard origin/main', DEPLOY);
  } catch {
    fs.rmSync(DEPLOY, { recursive: true, force: true });
    cloned = true;
  }
} else {
  fs.rmSync(DEPLOY, { recursive: true, force: true });
  cloned = true;
}
if (cloned) run(`git clone "${REPO}" ".ghio-deploy"`);

console.log('\n[3/4] Swapping in the fresh build...');
for (const entry of fs.readdirSync(DEPLOY)) {
  if (entry !== '.git') fs.rmSync(path.join(DEPLOY, entry), { recursive: true, force: true });
}
fs.cpSync(DIST, DEPLOY, { recursive: true });
fs.writeFileSync(path.join(DEPLOY, '.nojekyll'), ''); // stop Pages running Jekyll (it would eat _astro/)

console.log('\n[4/4] Publishing...');
run('git add -A', DEPLOY);
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const ident = '-c user.email=dominikmachowiak101@gmail.com -c user.name="Dominik Machowiak" -c core.autocrlf=false';
try {
  run(`git ${ident} commit -q -m "Deploy ${stamp}"`, DEPLOY);
} catch {
  console.log('  Nothing changed - already up to date.');
  process.exit(0);
}
run('git push origin main', DEPLOY);
console.log('\nDone. Live at https://dmac2112.github.io/ in ~1-2 minutes.');
