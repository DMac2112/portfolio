// Shared prop templates for the per-room trace configs.

// A lamp post measured off the art: cap top and base centre (poles lean with the perspective) and
// the box of its arm + hanging lantern. A base hidden behind a foreground roof has no footprint;
// `z` is then where the hidden base stands.
export const lamp = (id, { top, base, lantern, hidden = false, z }) => ({
  id, depth: hidden ? 0 : 12, z,
  shape: [
    [[top[0] - 8, top[1] - 2], [top[0] + 8, top[1] - 2], [base[0] + 8, base[1] - 16], [base[0] - 8, base[1] - 16]],
    ...(hidden ? [] : [[[base[0] - 8, base[1] - 24], [base[0] + 8, base[1] - 24], [base[0] + 15, base[1]], [base[0] - 15, base[1]]]]),
    [Math.min(top[0], lantern[0]), top[1] + 6, Math.max(top[0], lantern[2]), top[1] + 24],
    lantern,
  ],
  seed: [Math.round((top[0] + base[0]) / 2), Math.round((top[1] + base[1]) / 2)],
});
