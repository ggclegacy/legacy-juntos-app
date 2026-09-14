import type { Food } from "./model";
export const sampleFoods: Food[] = [
  ["Sample chicken · cooked", 165, 31, 0, 3.6],
  ["Sample rice · cooked", 130, 2.7, 28, 0.3],
  ["Sample black beans · cooked", 132, 8.9, 23.7, 0.5],
  ["Sample oats · dry", 380, 13, 68, 7],
  ["Sample olive oil", 884, 0, 0, 100],
  ["Sample plain yogurt", 60, 10, 4, 0.4],
  ["Sample banana", 89, 1.1, 22.8, 0.3],
].map(([name, kcal, protein, carbs, fat], i) => ({
  id: `sample-${i}`,
  name: String(name),
  brand: "Illustrative sample",
  preparation: String(name).includes("dry") ? "Dry" : "As described",
  per100: {
    kcal: Number(kcal),
    protein: Number(protein),
    carbs: Number(carbs),
    fat: Number(fat),
  },
  source: "sample",
  sourceId: "",
  barcode: "",
  notes:
    "Illustrative values for testing; verify your own food before real use.",
}));
