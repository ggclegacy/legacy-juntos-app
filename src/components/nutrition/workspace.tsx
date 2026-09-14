"use client";
import { useCallback, useMemo, useState } from "react";
import {
  Camera,
  Plus,
  LockKeyhole,
  Utensils,
  ChefHat,
  Sparkles,
} from "lucide-react";
import { Modal } from "../editor";
import { MealComposer, MacroLine } from "./composer";
import { FoodEditor } from "./food-editor";
import {
  useNutrition,
  type NutritionRequest,
} from "@/lib/nutrition/use-nutrition";
import {
  latest,
  totals,
  targetAt,
  recipeFood,
  localDate,
  weekDates,
  suggest,
  numberInput,
  type NutritionEvent,
  type Food,
  type Meal,
  type Recipe,
  type Day,
  type Targets,
  type Macros,
} from "@/lib/nutrition/model";
import { sampleFoods } from "@/lib/nutrition/sample";
const keys = ["kcal", "protein", "carbs", "fat"] as const;
export function Nutrition({
  userId,
  demo,
  request,
}: {
  userId: string;
  demo: boolean;
  request: NutritionRequest;
}) {
  const privateRequest = useCallback<NutritionRequest>(
    (path, init) =>
      request(path, {
        ...init,
        headers: { ...init?.headers, "x-expected-user": userId },
      }),
    [request, userId],
  );
  const store = useNutrition(userId, demo, privateRequest);
  const [date, setDate] = useState(localDate),
    [tab, setTab] = useState("Today"),
    [error, setError] = useState("");
  const [editor, setEditor] = useState<{
      mode?: string;
      recipe?: boolean;
      initial?: Meal | Recipe;
      event?: NutritionEvent;
    } | null>(null),
    [targetOpen, setTargetOpen] = useState(false),
    [foodOpen, setFoodOpen] = useState(false);
  const entries = latest(store.events),
    dayEvent = entries.find(
      (e) => e.payload.kind === "day" && e.payload.date === date,
    );
  const day: Day = (dayEvent?.payload as Day) ?? {
    kind: "day",
    date,
    dayType: "training",
    completeness: "partial",
    waterMl: 0,
    notes: "",
  };
  const target = targetAt(store.events, date),
    goal = target?.[day.dayType],
    consumed = totals(store.events, date);
  const meals = entries.filter(
      (e) => e.payload.kind === "meal" && e.payload.date === date,
    ),
    recipes = entries.filter((e) => e.payload.kind === "recipe");
  const foods = useMemo(() => {
    const map = new Map<string, Food>();
    if (demo) sampleFoods.forEach((f) => map.set(f.id, f));
    for (const e of latest(store.events)) {
      const p = e.payload;
      if (p.kind === "food") map.set(p.food.id, p.food);
      if (p.kind === "meal" || p.kind === "recipe")
        p.items.forEach((i) => map.set(i.food.id, i.food));
      if (p.kind === "recipe") map.set(e.entity_id, recipeFood(p, e.entity_id));
    }
    return [...map.values()];
  }, [store.events, demo]);
  async function act(task: () => Promise<void>) {
    try {
      setError("");
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  }
  const updateDay = (patch: Partial<Day>) =>
    act(() => store.save({ ...day, ...patch }, dayEvent));
  function exportDiary() {
    const data = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        sample: demo,
        events: store.events,
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([data], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `legacy-nutrition-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  if (!store.ready)
    return (
      <section className="nutrition">
        <p>{store.error || "Opening your private nutrition space…"}</p>
        {store.error && (
          <button onClick={() => void store.reload()}>Retry</button>
        )}
      </section>
    );
  return (
    <section className="nutrition">
      <header className="nutrition-hero">
        <div>
          <span className="nutrition-eyebrow">
            <LockKeyhole size={13} /> PRIVATE NUTRITION •{" "}
            {demo ? "SAMPLE SPACE" : "YOUR SPACE"}
          </span>
          <h1>
            Fuel your
            <br />
            <em>next level.</em>
          </h1>
          <p>
            Your food. Your rhythm. Your goals.
            <br />A clear picture of what fuels your progress.
          </p>
          <div className="nutrition-actions">
            <button
              className="primary"
              onClick={() => setEditor({ mode: "Photo" })}
            >
              <Camera size={18} /> Capture a meal
            </button>
            <button onClick={() => setEditor({})}>
              <Plus size={18} /> Log food
            </button>
          </div>
        </div>
        <div className="nutrition-orbit" aria-hidden="true">
          <Utensils size={48} />
          <span>NOURISH / BUILD / BECOME</span>
        </div>
      </header>
      {(error || store.error) && (
        <p role="alert" className="nutrition-error">
          {error || store.error}{" "}
          <button onClick={() => void store.reload()}>Reload</button>
        </p>
      )}
      <div className="nutrition-toolbar">
        <nav aria-label="Nutrition sections">
          {["Today", "Diary", "Kitchen", "Progress"].map((t) => (
            <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>
        <label>
          Viewing day
          <input
            aria-label="Nutrition date"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </label>
      </div>
      {(tab === "Today" || tab === "Diary") && (
        <>
          <div className="nutrition-summary">
            <div>
              <span className="nutrition-eyebrow">DAILY FUEL</span>
              <h2>{goal ? "Make every meal count." : "Set your direction."}</h2>
              <p>
                {target
                  ? `${target.source} · effective ${target.effective}`
                  : "Add your coach’s targets or your own. Nothing is prescribed automatically."}
              </p>
            </div>
            <button onClick={() => setTargetOpen(true)}>
              {target ? "Update targets" : "Set targets"}
            </button>
          </div>
          <div className="nutrition-macros">
            {keys.map((k) => (
              <div className={`nutrition-metric metric-${k}`} key={k}>
                <span>{k === "kcal" ? "Energy" : k}</span>
                <strong>
                  {Math.round(consumed[k])}
                  <small>{k === "kcal" ? " kcal" : " g"}</small>
                </strong>
                <div className="nutrition-track">
                  <i
                    style={{
                      width: goal
                        ? `${Math.min(100, (consumed[k] / Math.max(1, goal[k])) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
                <p>
                  {goal
                    ? `${Math.round(Math.abs(goal[k] - consumed[k]))}${k === "kcal" ? " kcal" : " g"} ${consumed[k] > goal[k] ? "over target" : "remaining"} / ${goal[k]}`
                    : "No target yet"}
                </p>
              </div>
            ))}
          </div>
          <div className="nutrition-day-controls">
            <label>
              Day type
              <select
                value={day.dayType}
                disabled={store.busy}
                onChange={(e) =>
                  void updateDay({ dayType: e.target.value as Day["dayType"] })
                }
              >
                <option value="training">Training day</option>
                <option value="rest">Rest day</option>
              </select>
            </label>
            <label>
              Diary status
              <select
                value={day.completeness}
                disabled={store.busy}
                onChange={(e) =>
                  void updateDay({
                    completeness: e.target.value as Day["completeness"],
                  })
                }
              >
                <option value="partial">Still logging</option>
                <option value="complete">Day complete</option>
                <option value="unlogged">Not fully tracked</option>
              </select>
            </label>
            <button
              disabled={store.busy}
              onClick={() =>
                void updateDay({ waterMl: Math.min(20000, day.waterMl + 250) })
              }
            >
              Water {day.waterMl} ml · +250
            </button>
            {day.waterMl > 0 && (
              <button
                disabled={store.busy}
                onClick={() =>
                  void updateDay({ waterMl: Math.max(0, day.waterMl - 250) })
                }
              >
                −250 ml
              </button>
            )}
          </div>
          <div className="nutrition-summary">
            <h2>Your plate, throughout the day</h2>
            <button onClick={() => setEditor({})}>
              <Plus size={16} /> Add meal
            </button>
          </div>
          <div className="nutrition-meals">
            {meals
              .filter((e) => (e.payload as Meal).state !== "removed")
              .map((e) => {
                const m = e.payload as Meal;
                return (
                  <article className="nutrition-meal" key={e.entity_id}>
                    <div>
                      <span className="nutrition-eyebrow">
                        {m.slot} · {m.state}
                      </span>
                      <h3>{m.name}</h3>
                      <p>
                        {m.items
                          .map((i) => `${i.grams} g ${i.food.name}`)
                          .join(" · ")}
                      </p>
                      <MacroLine items={m.items} />
                      {m.items.some((i) =>
                        i.portionSource.includes("estimate"),
                      ) && <small>Contains estimated portions</small>}
                    </div>
                    <div className="nutrition-actions">
                      <button
                        onClick={() => setEditor({ initial: m, event: e })}
                      >
                        Edit
                      </button>
                      {m.state === "planned" && (
                        <button
                          disabled={store.busy}
                          onClick={() =>
                            void act(() =>
                              store.save({ ...m, state: "eaten" }, e),
                            )
                          }
                        >
                          Mark eaten
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setEditor({
                            initial: { ...m, date: localDate(), name: m.name },
                          })
                        }
                      >
                        Repeat
                      </button>
                      <button
                        disabled={store.busy}
                        onClick={() =>
                          void act(() =>
                            store.save({ ...m, state: "removed" }, e),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>
          {!meals.some((e) => (e.payload as Meal).state !== "removed") && (
            <div className="nutrition-empty">
              <Utensils />
              <h3>A fresh page for your food.</h3>
              <p>
                Take a photo, type a meal, scan a product, or enter weighed
                ingredients.
              </p>
              <button onClick={() => setEditor({})}>
                Build your first plate
              </button>
            </div>
          )}
          {meals
            .filter((e) => (e.payload as Meal).state === "removed")
            .map((e) => (
              <button
                key={e.entity_id}
                disabled={store.busy}
                onClick={() =>
                  void act(() =>
                    store.save({ ...(e.payload as Meal), state: "eaten" }, e),
                  )
                }
              >
                Restore {(e.payload as Meal).name}
              </button>
            ))}
          {goal && tab === "Today" && (
            <aside className="nutrition-panel">
              <span className="nutrition-eyebrow">
                <Sparkles size={14} /> PORTION IDEAS
              </span>
              <h3>Work with what’s remaining.</h3>
              <p>
                Simple portions from your saved foods that fit the remaining
                macros. Review with your plan; these are not complete meal
                recommendations.
              </p>
              <div className="nutrition-actions">
                {suggest(
                  foods,
                  Object.fromEntries(
                    keys.map((k) => [k, Math.max(0, goal[k] - consumed[k])]),
                  ) as Macros,
                ).map(({ food, grams }) => (
                  <button
                    key={food.id}
                    onClick={() =>
                      setEditor({
                        initial: {
                          kind: "meal",
                          name: food.name,
                          date,
                          slot: "Snack",
                          state: "planned",
                          items: [
                            {
                              id: crypto.randomUUID(),
                              food,
                              grams,
                              portionSource: "entered",
                            },
                          ],
                          notes: "",
                        },
                      })
                    }
                  >
                    {grams} g · {food.name}
                  </button>
                ))}
              </div>
            </aside>
          )}
        </>
      )}
      {tab === "Kitchen" && (
        <>
          <div className="nutrition-summary">
            <div>
              <span className="nutrition-eyebrow">YOUR PERSONAL KITCHEN</span>
              <h2>Build once. Enjoy again.</h2>
              <p>
                Recipes use the weight of the finished batch. Every logged
                portion keeps its own nutrition snapshot.
              </p>
            </div>
            <div className="nutrition-actions">
              <button onClick={() => setFoodOpen(true)}>Add food</button>
              <button
                className="primary"
                onClick={() => setEditor({ recipe: true })}
              >
                <ChefHat size={17} /> Create recipe
              </button>
            </div>
          </div>
          <div className="nutrition-library">
            {recipes.map((e) => {
              const r = e.payload as Recipe;
              return (
                <article className="nutrition-panel" key={e.entity_id}>
                  <ChefHat />
                  <h3>{r.name}</h3>
                  <p>
                    {r.yieldGrams} g finished batch · {r.items.length}{" "}
                    ingredients
                  </p>
                  <MacroLine
                    items={[
                      {
                        id: e.id,
                        food: recipeFood(r, e.entity_id),
                        grams: 100,
                        portionSource: "recipe portion",
                      },
                    ]}
                  />
                  <small>Per 100 g finished recipe</small>
                  <div className="nutrition-actions">
                    <button
                      onClick={() =>
                        setEditor({ recipe: true, initial: r, event: e })
                      }
                    >
                      Edit recipe
                    </button>
                    <button
                      onClick={() =>
                        setEditor({
                          initial: {
                            kind: "meal",
                            name: r.name,
                            date,
                            slot: "Lunch",
                            state: "eaten",
                            items: [
                              {
                                id: crypto.randomUUID(),
                                food: recipeFood(r, e.entity_id),
                                grams: 100,
                                portionSource: "recipe portion",
                              },
                            ],
                            notes: "",
                          },
                        })
                      }
                    >
                      Log a portion
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <h3>Saved & recently used foods</h3>
          <div className="nutrition-library">
            {foods.map((f) => (
              <article className="nutrition-panel" key={f.id}>
                <span className="nutrition-eyebrow">{f.source}</span>
                <h3>{f.name}</h3>
                <p>
                  {f.preparation} · {f.per100.kcal.toFixed(0)} kcal / 100 g
                </p>
                <button
                  onClick={() =>
                    setEditor({
                      initial: {
                        kind: "meal",
                        name: f.name,
                        date,
                        slot: "Snack",
                        state: "eaten",
                        items: [
                          {
                            id: crypto.randomUUID(),
                            food: f,
                            grams: 100,
                            portionSource: "entered",
                          },
                        ],
                        notes: "",
                      },
                    })
                  }
                >
                  Use food
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "Progress" && (
        <>
          <div className="nutrition-summary">
            <div>
              <span className="nutrition-eyebrow">
                CONSISTENCY, WITH CONTEXT
              </span>
              <h2>Your last seven days</h2>
              <p>
                Incomplete days stay visible. Missing entries are never treated
                as zero intake.
              </p>
            </div>
            <button onClick={exportDiary}>Export private diary</button>
          </div>
          <div className="nutrition-table">
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Status</th>
                  <th>Calories</th>
                  <th>Protein</th>
                  <th>Carbs</th>
                  <th>Fat</th>
                </tr>
              </thead>
              <tbody>
                {weekDates(date).map((d) => {
                  const status = entries.find(
                    (e) => e.payload.kind === "day" && e.payload.date === d,
                  )?.payload as Day | undefined;
                  const has = entries.some(
                    (e) =>
                      e.payload.kind === "meal" &&
                      e.payload.date === d &&
                      e.payload.state === "eaten",
                  );
                  const t = totals(store.events, d);
                  return (
                    <tr key={d}>
                      <td>{d}</td>
                      <td>
                        {status?.completeness ?? (has ? "partial" : "unlogged")}
                      </td>
                      {keys.map((k) => (
                        <td key={k}>{has ? Math.round(t[k]) : "—"}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="nutrition-panel">
            <h3>Coach targets stay in your control.</h3>
            <p>
              Updates apply from the date you choose. Training and rest days can
              use different targets; the app never changes them from a weigh-in,
              photo, or incomplete diary.
            </p>
          </div>
        </>
      )}
      {editor && (
        <MealComposer
          {...editor}
          initialDate={date}
          foods={foods}
          demo={demo}
          request={privateRequest}
          onClose={() => setEditor(null)}
          onSave={async (p) => {
            await store.save(p, editor.event);
            setEditor(null);
          }}
        />
      )}
      {foodOpen && (
        <Modal
          title="Add to your food library"
          onClose={() => setFoodOpen(false)}
        >
          <FoodEditor
            onSave={async (f) => {
              await store.save({ kind: "food", food: f });
              setFoodOpen(false);
            }}
          />
        </Modal>
      )}
      {targetOpen && (
        <TargetEditor
          initial={target}
          date={date}
          onClose={() => setTargetOpen(false)}
          onSave={async (p) => {
            await store.save(p);
            setTargetOpen(false);
          }}
        />
      )}
      <footer className="nutrition-footnote">
        <LockKeyhole size={13} /> Private to your account.{" "}
        {demo
          ? "Sample data stays in this browser tab. Real AI and food search require connected services."
          : "Photos are used for the requested analysis, not saved in your diary."}{" "}
        Photo portions are estimates; a scale and verified food values improve
        precision.
      </footer>
    </section>
  );
}
function TargetEditor({
  initial,
  date,
  onClose,
  onSave,
}: {
  initial?: Targets;
  date: string;
  onClose: () => void;
  onSave: (t: Targets) => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="Your nutrition targets" onClose={onClose}>
      <form
        className="nutrition-target-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          try {
            const read = (day: string) =>
              Object.fromEntries(
                keys.map((k) => [k, numberInput(String(f.get(`${day}-${k}`)))]),
              ) as Macros;
            await onSave({
              kind: "targets",
              effective: String(f.get("effective")),
              source: String(f.get("source")) as Targets["source"],
              training: read("training"),
              rest: read("rest"),
              notes: String(f.get("notes")),
            });
          } catch (e) {
            setError(e instanceof Error ? e.message : "Check your targets.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>
          Enter the targets you and your coach chose. Saving creates a dated
          version; existing days keep their applicable targets.
        </p>
        <label>
          Target source
          <select name="source" defaultValue={initial?.source ?? "My coach"}>
            <option>My coach</option>
            <option>My own targets</option>
          </select>
        </label>
        <label>
          Effective from
          <input type="date" name="effective" required defaultValue={date} />
        </label>
        {(["training", "rest"] as const).map((d) => (
          <fieldset key={d}>
            <legend>{d === "training" ? "Training day" : "Rest day"}</legend>
            <div className="nutrition-target-grid">
              {keys.map((k) => (
                <label key={k}>
                  {k === "kcal" ? "Calories" : `${k} (g)`}
                  <input
                    name={`${d}-${k}`}
                    inputMode="decimal"
                    required
                    defaultValue={initial?.[d][k] ?? ""}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <label>
          Coach notes
          <textarea
            name="notes"
            maxLength={1000}
            defaultValue={initial?.notes}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : "Save targets"}
        </button>
      </form>
    </Modal>
  );
}
