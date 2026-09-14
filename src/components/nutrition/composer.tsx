"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  Camera,
  Plus,
  Search,
  Trash2,
  ScanBarcode,
  Mic,
  Utensils,
} from "lucide-react";
import { Modal } from "@/components/editor";
import { FoodEditor } from "./food-editor";
import { BarcodeScanner, prepareImage } from "./scanner";
import {
  sum,
  numberInput,
  localDate,
  validBarcode,
  type Food,
  type Item,
  type Meal,
  type Recipe,
} from "@/lib/nutrition/model";
import type { NutritionRequest } from "@/lib/nutrition/use-nutrition";
export function MacroLine({ items }: { items: Item[] }) {
  const m = sum(items);
  return (
    <div className="nutrition-macroline">
      <strong>
        {Math.round(m.kcal)} <small>kcal</small>
      </strong>
      <span>
        <b>{m.protein.toFixed(1)}</b> protein
      </span>
      <span>
        <b>{m.carbs.toFixed(1)}</b> carbs
      </span>
      <span>
        <b>{m.fat.toFixed(1)}</b> fat
      </span>
    </div>
  );
}
export function MealComposer({
  initial,
  initialDate,
  mode = "Search",
  recipe = false,
  foods,
  demo,
  request,
  onClose,
  onSave,
}: {
  initial?: Meal | Recipe;
  initialDate?: string;
  mode?: string;
  recipe?: boolean;
  foods: Food[];
  demo: boolean;
  request: NutritionRequest;
  onClose: () => void;
  onSave: (p: Meal | Recipe) => Promise<void>;
}) {
  const [items, setItems] = useState<Item[]>(initial?.items ?? []),
    [tab, setTab] = useState(mode),
    [query, setQuery] = useState(""),
    [results, setResults] = useState<Food[]>([]),
    [custom, setCustom] = useState<Food | null | undefined>(undefined),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [image, setImage] = useState(""),
    [notes, setNotes] = useState<string[]>([]),
    [consent, setConsent] = useState(false),
    [camera, setCamera] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [replaceId, setReplaceId] = useState<string | null>(null);
  const [name, setName] = useState(
      initial?.name ?? (recipe ? "My recipe" : "My meal"),
    ),
    [date, setDate] = useState(
      initial?.kind === "meal" ? initial.date : (initialDate ?? localDate()),
    ),
    [slot, setSlot] = useState<Meal["slot"]>(
      initial?.kind === "meal" ? initial.slot : "Lunch",
    ),
    [state, setState] = useState<"planned" | "eaten">(
      initial?.kind === "meal" && initial.state === "planned"
        ? "planned"
        : "eaten",
    ),
    [yieldGrams, setYieldGrams] = useState(
      initial?.kind === "recipe" ? String(initial.yieldGrams) : "",
    ),
    [memo, setMemo] = useState(initial?.notes ?? "");
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (items.length) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [items.length]);
  function add(food: Food) {
    setItems((v) =>
      replaceId
        ? v.map((i) => (i.id === replaceId ? { ...i, food } : i))
        : [
            ...v,
            {
              id: crypto.randomUUID(),
              food,
              grams: 100,
              portionSource: "entered",
            },
          ],
    );
    setReplaceId(null);
    setCustom(undefined);
    setReviewed(false);
  }
  async function search(code?: string) {
    setBusy(true);
    setError("");
    try {
      const value = (code ?? query).trim();
      const barcode = tab === "Barcode" || Boolean(code);
      if (barcode && !validBarcode(value))
        throw new Error("Enter a valid barcode including its check digit.");
      if (demo) {
        setResults(
          foods.filter((f) =>
            barcode
              ? f.barcode === value
              : `${f.name} ${f.brand}`
                  .toLowerCase()
                  .includes(value.toLowerCase()),
          ),
        );
      } else {
        const r = await request(
          `/api/nutrition/search?q=${encodeURIComponent(value)}${barcode ? "&barcode=true" : ""}`,
        );
        setResults(r.foods ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }
  const codeFound = useCallback((code: string) => {
    setCamera(false);
    setQuery(code);
    setResults([]);
  }, []);
  const analysisIds = useRef<string[]>([]);
  async function analyze() {
    setBusy(true);
    setError("");
    try {
      const r = await request("/api/nutrition/analyze", {
        method: "POST",
        body: JSON.stringify({
          mode: tab === "Photo" ? "photo" : tab === "Label" ? "label" : "text",
          text: query,
          image: tab === "Type / speak" ? undefined : image || undefined,
          consent: true,
        }),
      });
      setNotes(r.notes ?? []);
      if (r.label) {
        setCustom(r.label);
      } else {
        const previousIds = analysisIds.current;
        setItems((v) => [
          ...v.filter((i) => !previousIds.includes(i.id)),
          ...(r.items ?? []),
        ]);
        analysisIds.current = (r.items ?? []).map((i) => i.id);
      }
      setReviewed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      if (!items.length) throw new Error("Add at least one food.");
      if (notes.length && !reviewed)
        throw new Error(
          "Review the proposed matches and any missing ingredients before saving.",
        );
      if (recipe)
        await onSave({
          kind: "recipe",
          name,
          items,
          yieldGrams: numberInput(yieldGrams),
          notes: memo,
        });
      else
        await onSave({
          kind: "meal",
          name,
          date,
          slot,
          state,
          items,
          notes: [memo, ...notes].filter(Boolean).join("\n").slice(0, 1000),
        });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save. Your draft is still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={recipe ? "Your meal-prep kitchen" : "Build your plate"}
      onClose={onClose}
      wide
    >
      <div className="nutrition-composer">
        <div className="nutrition-form">
          <label>
            {recipe ? "Recipe name" : "Meal name"}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={160}
            />
          </label>
          {recipe ? (
            <label>
              Finished batch weight (g)
              <input
                value={yieldGrams}
                onChange={(e) => setYieldGrams(e.target.value)}
                inputMode="decimal"
                placeholder="Weigh the whole cooked batch"
              />
            </label>
          ) : (
            <>
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label>
                Meal
                <select
                  value={slot}
                  onChange={(e) => setSlot(e.target.value as Meal["slot"])}
                >
                  {["Breakfast", "Lunch", "Dinner", "Snack"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Log as
                <select
                  value={state}
                  onChange={(e) =>
                    setState(e.target.value as "planned" | "eaten")
                  }
                >
                  <option value="eaten">Eaten</option>
                  <option value="planned">Planned · not counted yet</option>
                </select>
              </label>
            </>
          )}
        </div>
        <div
          className="nutrition-entry-tabs"
          role="group"
          aria-label="Food entry methods"
        >
          {["Search", "Photo", "Type / speak", "Barcode", "Label"].map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t);
                setResults([]);
                setError("");
                setCamera(false);
              }}
            >
              {t === "Photo" ? (
                <Camera size={14} />
              ) : t === "Barcode" ? (
                <ScanBarcode size={14} />
              ) : t === "Type / speak" ? (
                <Mic size={14} />
              ) : (
                <Search size={14} />
              )}{" "}
              {t}
            </button>
          ))}
        </div>
        {replaceId && (
          <p className="nutrition-note">
            Choose the replacement food below. The current gram amount will be
            kept.
          </p>
        )}
        {(tab === "Photo" || tab === "Label") && (
          <div className="nutrition-capture">
            <Camera size={28} />
            <h3>
              {tab === "Photo"
                ? "Let your plate do the talking."
                : "Read the package, not the guess."}
            </h3>
            <p>
              {tab === "Photo"
                ? "Use good light. Include the whole plate and add preparation or weighed amounts below."
                : "Photograph the nutrition panel and gram-based serving information."}
            </p>
            <label className="secondary">
              {image ? "Choose another photo" : "Take or upload a photo"}
              <input
                aria-label="Food or label photo"
                type="file"
                accept="image/*"
                capture="environment"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    void prepareImage(f)
                      .then(setImage)
                      .catch(() =>
                        setError(
                          "Could not read the photo. Try a JPEG or PNG.",
                        ),
                      );
                  e.target.value = "";
                }}
              />
            </label>
            {image && (
              <div
                className="nutrition-photo"
                role="img"
                aria-label="Selected food photo"
                style={{ backgroundImage: `url(${image})` }}
              />
            )}
          </div>
        )}
        {tab === "Barcode" && (
          <>
            <button className="secondary" onClick={() => setCamera((v) => !v)}>
              {camera ? "Close camera" : "Open barcode camera"}
            </button>
            {camera && <BarcodeScanner onCode={codeFound} />}
          </>
        )}
        <label className="nutrition-query">
          {tab === "Barcode"
            ? "Barcode number"
            : tab === "Search"
              ? "Find a food"
              : tab === "Type / speak"
                ? "Describe your meal · English or Portuguese"
                : "Add details (optional)"}
          {tab === "Type / speak" ? (
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="150 g cooked chicken, 120 g cooked rice, 10 g olive oil"
              rows={3}
            />
          ) : (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "Barcode"
                  ? "Enter all barcode digits"
                  : tab === "Search"
                    ? "Search your library or the food database"
                    : "Preparation, weights, oil, sauces…"
              }
            />
          )}
        </label>
        {tab === "Type / speak" && (
          <p className="nutrition-note">
            You can use your phone keyboard’s microphone to dictate. Dedicated
            in-app voice recording is not connected.
          </p>
        )}
        {tab === "Search" || tab === "Barcode" ? (
          <div className="nutrition-actions">
            <button
              className="primary small"
              disabled={busy || query.trim().length < 2}
              onClick={() => void search()}
            >
              {busy
                ? "Searching…"
                : tab === "Barcode"
                  ? "Find product"
                  : "Search foods"}
            </button>
            <button className="secondary small" onClick={() => setCustom(null)}>
              Enter a custom food
            </button>
          </div>
        ) : (
          <>
            <label className="nutrition-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />{" "}
              Send this description/photo to the configured AI provider to
              prepare a draft.
            </label>
            <button
              className="primary"
              disabled={
                demo || !consent || busy || (tab !== "Type / speak" && !image)
              }
              onClick={() => void analyze()}
            >
              {busy ? "Preparing your plate…" : "Analyze draft"}
            </button>
            {demo && (
              <p className="nutrition-note">
                Sample mode: image/text AI is not simulated. Connect a private
                account and the AI/database services to analyze meals. Search
                sample foods or enter label values manually.
              </p>
            )}
          </>
        )}
        {results.length > 0 && (
          <div className="nutrition-food-results">
            {results.map((f) => (
              <button key={f.id} onClick={() => add(f)}>
                <span>
                  {f.name}
                  <small>
                    {f.brand} · {f.preparation} · {f.source}
                  </small>
                </span>
                <Plus size={16} />
              </button>
            ))}
          </div>
        )}
        {!results.length && tab === "Search" && (
          <div className="nutrition-food-results">
            {foods
              .filter(
                (f) =>
                  !query || f.name.toLowerCase().includes(query.toLowerCase()),
              )
              .slice(0, 8)
              .map((f) => (
                <button key={f.id} onClick={() => add(f)}>
                  <span>
                    {f.name}
                    <small>
                      {f.source} · {f.per100.kcal} kcal / 100 g
                    </small>
                  </span>
                  <Plus size={16} />
                </button>
              ))}
          </div>
        )}
        {tab === "Barcode" && !results.length && (
          <p className="nutrition-note">
            No product selected. If a lookup has no match, scan its label or
            enter a custom food.
          </p>
        )}
        {custom !== undefined && (
          <div className="nutrition-custom">
            <h3>{custom ? "Review extracted label" : "Your own food"}</h3>
            <FoodEditor
              key={custom?.id ?? "new"}
              initial={custom ?? undefined}
              onSave={add}
            />
            <button
              className="text-button"
              onClick={() => setCustom(undefined)}
            >
              Cancel custom food
            </button>
          </div>
        )}
        <div className="nutrition-plate">
          <h3>
            <Utensils size={18} /> On your plate
          </h3>
          {!items.length && (
            <p>Add a food to begin. Every entry stays editable.</p>
          )}
          {items.map((item) => (
            <div className="nutrition-ingredient" key={item.id}>
              <div>
                <strong>{item.food.name}</strong>
                <small>
                  {item.food.source} · {item.food.preparation}
                </small>
                <button
                  className="text-button"
                  onClick={() => {
                    setReplaceId(item.id);
                    setTab("Search");
                  }}
                >
                  Swap food
                </button>
              </div>
              <label>
                Grams
                <input
                  aria-label={`${item.food.name} grams`}
                  type="number"
                  min="0.1"
                  max="20000"
                  step="any"
                  value={item.grams || ""}
                  onChange={(e) => {
                    setReviewed(false);
                    setItems((v) =>
                      v.map((i) =>
                        i.id === item.id
                          ? { ...i, grams: Number(e.target.value) }
                          : i,
                      ),
                    );
                  }}
                />
              </label>
              <label>
                Amount source
                <select
                  aria-label={`${item.food.name} amount source`}
                  value={item.portionSource}
                  onChange={(e) =>
                    setItems((v) =>
                      v.map((i) =>
                        i.id === item.id
                          ? {
                              ...i,
                              portionSource: e.target
                                .value as Item["portionSource"],
                            }
                          : i,
                      ),
                    )
                  }
                >
                  {[
                    "entered",
                    "weighed",
                    "photo estimate",
                    "text estimate",
                    "recipe portion",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <button
                className="icon-button"
                aria-label={`Remove ${item.food.name}`}
                onClick={() =>
                  setItems((v) => v.filter((i) => i.id !== item.id))
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <MacroLine items={items} />
        </div>
        {notes.length > 0 && (
          <div className="nutrition-note">
            <strong>Review before logging</strong>
            {notes.map((n, i) => (
              <p key={i}>{n}</p>
            ))}
            <label className="nutrition-consent">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />{" "}
              I reviewed the food matches, amounts, and any missing components.
            </label>
          </div>
        )}
        <label className="nutrition-query">
          Notes
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={700}
          />
        </label>
        {recipe && (
          <p className="nutrition-note">
            Batch portions assume a uniform mixture. For separate
            chicken/rice/vegetable portions, weigh each component instead.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="nutrition-save">
          <button
            className="primary"
            disabled={busy || !items.length}
            onClick={() => void save()}
          >
            {busy
              ? "Saving…"
              : recipe
                ? "Save recipe"
                : state === "planned"
                  ? "Save planned meal"
                  : "Log meal"}
          </button>
          <button className="text-button" onClick={onClose}>
            Discard draft
          </button>
        </div>
      </div>
    </Modal>
  );
}
