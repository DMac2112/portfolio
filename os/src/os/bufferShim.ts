// gray-matter (locked by plan §3) probes Buffer at runtime; browser bundles have no Buffer
// global. Its string-input path only ever calls Buffer.isBuffer / Buffer.from(string), so this
// minimal shim keeps the real library working without pulling in a full Node polyfill.
// MUST be imported before 'gray-matter'.
const g = globalThis as unknown as {
  Buffer?: { isBuffer(v: unknown): boolean; from(v: string): string };
};
if (!g.Buffer) {
  g.Buffer = {
    isBuffer: () => false,
    from: (v: string) => v,
  };
}
export {};
