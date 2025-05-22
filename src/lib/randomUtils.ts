export const ratios = ["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"];
export const models = [
  { id: "black-forest-labs/flux-1.1-pro-ultra", name: "Flux Pro Ultra" },
  { id: "ideogram-ai/ideogram-v3-quality", name: "Ideogram 3.0" }
];

export function getRandomRatio(): string {
  return ratios[Math.floor(Math.random() * ratios.length)];
}

export function getRandomModel() {
  return models[Math.floor(Math.random() * models.length)];
}

export function generateTagsFromPrompt(prompt: string): string[] {
  const keywords = prompt
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(" ")
    .filter((word) => word.length > 2 && word.length < 20);
  const unique = [...new Set(keywords)];
  return shuffle(unique).slice(0, Math.min(6, unique.length));
}

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length;
  while (currentIndex !== 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}
