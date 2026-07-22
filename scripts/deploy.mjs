// deploy.mjs — one command to publish the whole site to dmac2112.github.io.
//
//   run:  .\deploy.cmd          (from the portfolio-rework folder)
//
// Rebuilds DominikOS from source, re-vendors it into public/, builds the Astro site with
// Node 20, then pushes the built dist/ into the DMac2112.github.io repo, which GitHub Pages
// serves at the root domain. A reusable clone is kept at .ghio-deploy/ (gitignored).
//
// Everything in this folder ships in one command — including the OS, which used to be a
// separate repo you had to remember to rebuild and vendor by hand. Forgetting that step
// published a stale OS while still reporting success; now it can't happen.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const DEPLOY = path.join(ROOT, '.ghio-deploy');
const OS_APP = path.join(ROOT, 'dominikos', 'os');
const REPO = 'https://github.com/DMac2112/DMac2112.github.io.git';
const run = (cmd, cwd = ROOT) => execSync(cmd, { cwd, stdio: 'inherit', shell: true });

// --skip-os is an escape hatch for site-only changes; the default always rebuilds.
if (!process.argv.includes('--skip-os') && fs.existsSync(path.join(OS_APP, 'package.json'))) {
  console.log('\n[1/5] Rebuilding DominikOS + re-vendoring into public/...');
  run(`"${path.join(ROOT, 'npm20.cmd')}" --prefix "${OS_APP}" run build`);
  run(`node "${path.join(OS_APP, 'scripts', 'deploy-rework.mjs')}"`);
} else {
  console.log('\n[1/5] Skipping the OS rebuild — publishing whatever is vendored in public/.');
}

console.log('\n[2/5] Building the site (Node 20)...');
run(`"${path.join(ROOT, 'npm20.cmd')}" run build`);
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('x build produced no dist/index.html - aborting.');
  process.exit(1);
}

console.log('\n[3/5] Syncing the deploy repo...');
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

console.log('\n[4/5] Swapping in the fresh build...');
for (const entry of fs.readdirSync(DEPLOY)) {
  if (entry !== '.git') fs.rmSync(path.join(DEPLOY, entry), { recursive: true, force: true });
}
fs.cpSync(DIST, DEPLOY, { recursive: true });
fs.writeFileSync(path.join(DEPLOY, '.nojekyll'), ''); // stop Pages running Jekyll (it would eat _astro/)

console.log('\n[5/5] Publishing...');
run('git add -A', DEPLOY);
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const ident = '-c user.email=dominikmachowiak101@gmail.com -c user.name="Dominik Machowiak" -c core.autocrlf=false';
// An unchanged site must NOT short-circuit the run: the source safety net below still has to
// happen, or a docs/tooling-only change deploys "successfully" and stays uncommitted forever.
let sitePublished = true;
try {
  run(`git ${ident} commit -q -m "Deploy ${stamp}"`, DEPLOY);
} catch {
  console.log('  Site output unchanged - nothing new to publish.');
  sitePublished = false;
}
if (sitePublished) run('git push origin main', DEPLOY);

// Source safety net: the built site is now public, so make sure the code that produced it
// exists in history too. Without this, a deploy can leave the live site ahead of the repo —
// which is how work gets lost. --no-commit publishes without touching source history.
if (!process.argv.includes('--no-commit')) {
  console.log('\n[+] Committing and pushing the source...');
  try {
    run('git add -A');
    try {
      run(`git commit -q -m "Deploy ${stamp}: source snapshot"`);
      console.log('  Source committed.');
    } catch {
      console.log('  Source already clean — nothing to commit.');
    }
    run('git push origin HEAD');
    console.log('  Source pushed to origin.');
  } catch (err) {
    console.warn('  ! Source commit/push failed — the SITE IS LIVE but the code is not pushed.');
    console.warn('    Fix this before you stop: git add -A && git commit && git push');
  }
}

console.log(sitePublished
  ? '\nDone. Live at https://dmac2112.github.io/ in ~1-2 minutes.'
  : '\nDone. The live site was already up to date; source is committed and pushed.');
