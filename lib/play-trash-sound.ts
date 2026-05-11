// lib/play-trash-sound.ts
export function playTrashSound() {
  const audio = new Audio('/audio/drag%20to%20trash.mp3')

  void audio.play().catch(() => {
    // Browsers may block audio in some contexts; deletion should still proceed.
  })
}
