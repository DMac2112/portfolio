#!/usr/bin/env node
// gen-master.mjs — zero-dependency Gemini image generator for the Frostbyte art pipeline.
//
// Exists because nano-banana-mcp hardcodes the retired `gemini-2.5-flash-image-preview`
// model (Google returns 404). This talks to the REST API directly, so it keeps working as
// model names move on: pass --model to switch. Claude and Codex can both just run it.
//
// Usage:
//   node gen-master.mjs --prompt "a snowy plaza"  --out plaza.png
//   node gen-master.mjs --prompt-file p.txt --out out.png -n 3 --aspect 3:2
//   node gen-master.mjs --prompt "same style, new scene: docks" --ref reference/plaza.png --out docks.png
//   node gen-master.mjs --list
//
// Auth: GEMINI_API_KEY in the environment. The key is never printed or logged.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = 'https://generativelanguage.googleapis.com/v1beta';
const KEY = process.env.GEMINI_API_KEY;

// Flash is the cheap workhorse; --model gemini-3-pro-image for hero shots.
const DEFAULT_MODEL = 'gemini-3.1-flash-image';

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

function parseArgs(argv) {
  const out = { n: 1, model: DEFAULT_MODEL, refs: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--prompt') out.prompt = next();
    else if (a === '--prompt-file') out.prompt = fs.readFileSync(next(), 'utf8').trim();
    else if (a === '--out') out.out = next();
    else if (a === '--model') out.model = next();
    else if (a === '--aspect') out.aspect = next();
    else if (a === '--ref') out.refs.push(next());
    else if (a === '-n' || a === '--count') out.n = Number(next());
    else if (a === '--list') out.list = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return out;
}

async function listModels() {
  const res = await fetch(`${API}/models?key=${KEY}&pageSize=200`);
  const body = await res.json();
  if (!res.ok) throw new Error(describeError(res.status, body));
  for (const m of body.models) {
    if (/image/i.test(m.name)) console.log(`  ${m.name.replace('models/', '')}`);
  }
}

// Google's error bodies are nested and the useful part is buried; surface it plainly.
function describeError(status, body) {
  const e = body?.error ?? {};
  const detail = [e.status, e.message].filter(Boolean).join(': ') || JSON.stringify(body).slice(0, 400);
  if (status === 429) return `quota exhausted (HTTP 429). ${detail}`;
  if (status === 404) return `model not found (HTTP 404) — run --list to see live names. ${detail}`;
  if (status === 400 && /API key/i.test(detail)) return `bad API key (HTTP 400). ${detail}`;
  return `HTTP ${status}. ${detail}`;
}

function refPart(file) {
  const ext = path.extname(file).toLowerCase();
  const mimeType = MIME[ext];
  if (!mimeType) throw new Error(`unsupported reference image type: ${ext}`);
  return { inlineData: { mimeType, data: fs.readFileSync(file).toString('base64') } };
}

async function generate({ prompt, model, aspect, refs }) {
  // Reference images go BEFORE the text so the prompt reads as an instruction about them —
  // this is what makes style-lock ("same palette and lighting as this") actually hold.
  const parts = [...refs.map(refPart), { text: prompt }];
  const generationConfig = { responseModalities: ['IMAGE'] };
  if (aspect) generationConfig.imageConfig = { aspectRatio: aspect };

  const res = await fetch(`${API}/models/${model}:generateContent?key=${KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(describeError(res.status, body));

  const cand = body.candidates?.[0];
  const image = cand?.content?.parts?.find((p) => p.inlineData?.data);
  if (!image) {
    const reason = cand?.finishReason ?? body.promptFeedback?.blockReason ?? 'no reason given';
    const text = cand?.content?.parts?.find((p) => p.text)?.text;
    throw new Error(`no image in response (${reason})${text ? ` — model said: ${text.slice(0, 200)}` : ''}`);
  }
  return Buffer.from(image.inlineData.data, 'base64');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 17).join('\n').replace(/^\/\/ ?/gm, ''));
    return;
  }
  if (!KEY) throw new Error('GEMINI_API_KEY is not set in this environment.');
  if (args.list) return listModels();
  if (!args.prompt) throw new Error('need --prompt or --prompt-file (or --list).');
  if (!args.out) throw new Error('need --out <file.png>.');

  const outAbs = path.resolve(HERE, args.out);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  const ext = path.extname(outAbs) || '.png';
  const stem = outAbs.slice(0, outAbs.length - ext.length);

  for (let i = 1; i <= args.n; i++) {
    // -n names candidates out-1.png, out-2.png … so a batch never overwrites itself.
    const file = args.n === 1 ? outAbs : `${stem}-${i}${ext}`;
    const buf = await generate(args);
    fs.writeFileSync(file, buf);
    console.log(`${path.relative(HERE, file).replace(/\\/g, '/')}  ${(buf.length / 1024).toFixed(0)}KB  [${args.model}]`);
  }
}

main().catch((err) => {
  console.error(`gen-master: ${err.message}`);
  // exitCode, not exit(): calling exit() while fetch's sockets are still closing trips a
  // libuv assertion on Windows and buries the error message we just printed.
  process.exitCode = 1;
});
