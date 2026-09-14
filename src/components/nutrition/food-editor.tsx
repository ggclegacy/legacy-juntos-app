"use client";
import { useState } from "react";
import { foodSchema, numberInput, type Food } from "@/lib/nutrition/model";
export function FoodEditor({
  initial,
  onSave,
}: {
  initial?: Food;
  onSave: (food: Food) => void | Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="nutrition-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const data = new FormData(e.currentTarget),
            get = (k: string) => String(data.get(k) ?? ""),
            basis = numberInput(get("basis"));
          if (basis <= 0)
            throw new Error(
              "Enter the gram weight the nutrition values refer to.",
            );
          const p = foodSchema.safeParse({
            id: initial?.id ?? crypto.randomUUID(),
            name: get("name"),
            brand: get("brand"),
            preparation: get("preparation"),
            per100: {
              kcal: (numberInput(get("kcal")) * 100) / basis,
              protein: (numberInput(get("protein")) * 100) / basis,
              carbs: (numberInput(get("carbs")) * 100) / basis,
              fat: (numberInput(get("fat")) * 100) / basis,
            },
            source: initial?.source === "label" ? "label" : "manual",
            sourceId: "",
            barcode: get("barcode"),
            notes:
              initial?.notes ??
              "User-entered nutrition; confirm against the product or source.",
          });
          if (!p.success) throw new Error(p.error.issues[0].message);
          await onSave(p.data);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Check your values.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Food name
        <input name="name" required defaultValue={initial?.name} />
      </label>
      <label>
        Brand (optional)
        <input name="brand" defaultValue={initial?.brand} />
      </label>
      <label>
        Preparation / raw or cooked
        <input name="preparation" defaultValue={initial?.preparation} />
      </label>
      <label>
        These values are for how many grams?
        <input name="basis" defaultValue="100" required inputMode="decimal" />
      </label>
      {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
        <label key={k}>
          {k === "kcal"
            ? "Calories (kcal)"
            : `${k[0].toUpperCase() + k.slice(1)} (g)`}
          <input
            name={k}
            inputMode="decimal"
            required
            defaultValue={initial?.per100[k] ?? ""}
          />
        </label>
      ))}
      <label>
        Barcode (optional)
        <input name="barcode" defaultValue={initial?.barcode} />
      </label>
      <label className="nutrition-wide nutrition-consent">
        <input type="checkbox" required /> I verified the values and their gram
        basis. A volume-only label needs a known gram equivalent.
      </label>
      {error && (
        <p role="alert" className="error nutrition-wide">
          {error}
        </p>
      )}
      <button className="primary" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Use this food"}
      </button>
    </form>
  );
}
