export function handleEscape(event, { layers, inMinigame, doc }) {
  if (event.key !== 'Escape') return 'none';
  for (const layer of layers) {
    if (layer.isOpen()) {
      layer.close();
      event.preventDefault();
      return 'closed';
    }
  }
  if (inMinigame) return 'minigame';
  if (doc.fullscreenElement) {
    Promise.resolve(doc.exitFullscreen()).catch(() => {});
    return 'exit-fullscreen';
  }
  return 'none';
}
