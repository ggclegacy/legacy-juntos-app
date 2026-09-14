"use client";
import { useState } from "react";
import { Plus, ArrowUp, ArrowDown, Copy, Trash2, Save } from "lucide-react";
import {
  EXERCISES,
  exercise,
  programSchema,
  type Program,
  type Exercise,
} from "@/lib/training/model";
export function ProgramBuilder({
  initial,
  onSave,
  onCancel,
}: {
  initial: Program;
  onSave: (p: Program) => Promise<void>;
  onCancel: () => void;
}) {
  const [p, setP] = useState(initial),
    [day, setDay] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState("");
  const current = p.days[day];
  function patch(i: number, change: Partial<Exercise>) {
    setP({
      ...p,
      days: p.days.map((d, n) =>
        n === day
          ? {
              ...d,
              exercises: d.exercises.map((e, j) =>
                i === j ? { ...e, ...change } : e,
              ),
            }
          : d,
      ),
    });
  }
  function replace(list: Exercise[]) {
    setP({
      ...p,
      days: p.days.map((d, i) => (i === day ? { ...d, exercises: list } : d)),
    });
  }
  function move(i: number, delta: number) {
    const a = [...current.exercises];
    [a[i], a[i + delta]] = [a[i + delta], a[i]];
    replace(a);
  }
  return (
    <section className="training-builder">
      <div className="training-section-heading">
        <div>
          <span className="eyebrow">YOUR PROGRAM · YOUR CHOICES</span>
          <h2>Make it yours.</h2>
        </div>
        <button className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <div className="training-fields">
        <label>
          Program name
          <input
            value={p.name}
            maxLength={120}
            onChange={(e) => setP({ ...p, name: e.target.value })}
          />
        </label>
        <label>
          Training goal
          <input
            value={p.goal}
            maxLength={2000}
            placeholder="Strength, hypertrophy, prep, general fitness…"
            onChange={(e) => setP({ ...p, goal: e.target.value })}
          />
        </label>
        <label>
          Repeat for cycles
          <input
            type="number"
            min={1}
            max={52}
            value={p.cycles}
            onChange={(e) => setP({ ...p, cycles: Number(e.target.value) })}
          />
        </label>
        <label>
          Progression guidance
          <select
            value={p.guidance}
            onChange={(e) =>
              setP({ ...p, guidance: e.target.value as Program["guidance"] })
            }
          >
            <option value="exact">Follow my prescription</option>
            <option value="suggest">Show suggestions for review</option>
          </select>
        </label>
      </div>
      <p className="muted">
        Workouts run in your chosen order. One cycle completes the sequence;
        rest days are yours to choose.
      </p>
      <div className="training-day-tabs">
        {p.days.map((d, i) => (
          <button
            key={d.id}
            className={day === i ? "selected" : ""}
            onClick={() => setDay(i)}
          >
            {d.name}
          </button>
        ))}
        <button
          disabled={p.days.length >= 14}
          onClick={() => {
            setP({
              ...p,
              days: [
                ...p.days,
                {
                  id: crypto.randomUUID(),
                  name: `Workout ${p.days.length + 1}`,
                  exercises: [exercise()],
                },
              ],
            });
            setDay(p.days.length);
          }}
        >
          <Plus size={14} />
          Add workout
        </button>
      </div>
      <div className="training-fields">
        <label>
          Workout name
          <input
            value={current.name}
            maxLength={100}
            onChange={(e) =>
              setP({
                ...p,
                days: p.days.map((d, i) =>
                  i === day ? { ...d, name: e.target.value } : d,
                ),
              })
            }
          />
        </label>
        <div className="inline-actions">
          <button
            className="text-button"
            disabled={p.days.length >= 14}
            onClick={() => {
              setP({
                ...p,
                days: [
                  ...p.days,
                  {
                    ...structuredClone(current),
                    id: crypto.randomUUID(),
                    name: `${current.name} copy`.slice(0, 100),
                    exercises: current.exercises.map((e) => ({
                      ...e,
                      id: crypto.randomUUID(),
                    })),
                  },
                ],
              });
              setDay(p.days.length);
            }}
          >
            <Copy size={14} />
            Duplicate workout
          </button>
          <button
            className="text-button"
            disabled={p.days.length === 1}
            onClick={() => {
              setP({ ...p, days: p.days.filter((_, i) => i !== day) });
              setDay(0);
            }}
          >
            Remove workout
          </button>
        </div>
      </div>
      {current.exercises.map((e, i) => (
        <article className="training-exercise-editor" key={e.id}>
          <div className="training-section-heading">
            <strong>
              <span className="training-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              {e.name}
            </strong>
            <div className="inline-actions">
              <button
                aria-label={`Move ${e.name} up`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp size={15} />
              </button>
              <button
                aria-label={`Move ${e.name} down`}
                disabled={i === current.exercises.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown size={15} />
              </button>
              <button
                aria-label={`Remove ${e.name}`}
                onClick={() =>
                  replace(current.exercises.filter((_, j) => i !== j))
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <div className="training-fields">
            <label>
              Exercise
              <input
                aria-label={`Exercise ${i + 1} name`}
                value={e.name}
                maxLength={120}
                onChange={(v) => patch(i, { name: v.target.value })}
              />
            </label>
            <label>
              Equipment / machine
              <input
                value={e.equipment}
                maxLength={120}
                onChange={(v) => patch(i, { equipment: v.target.value })}
              />
            </label>
            <label>
              Primary muscle
              <input
                value={e.muscle}
                maxLength={60}
                onChange={(v) => patch(i, { muscle: v.target.value })}
              />
            </label>
          </div>
          <div className="training-prescription">
            <label>
              Sets
              <input
                type="number"
                min={1}
                max={20}
                value={e.sets}
                onChange={(v) => patch(i, { sets: Number(v.target.value) })}
              />
            </label>
            <label>
              {e.type === "timed" ? "Seconds min" : "Reps min"}
              <input
                type="number"
                min={1}
                max={1000}
                value={e.repsMin}
                onChange={(v) => patch(i, { repsMin: Number(v.target.value) })}
              />
            </label>
            <label>
              {e.type === "timed" ? "Seconds max" : "Reps max"}
              <input
                type="number"
                min={1}
                max={1000}
                value={e.repsMax}
                onChange={(v) => patch(i, { repsMax: Number(v.target.value) })}
              />
            </label>
            <label>
              Rest seconds
              <input
                type="number"
                min={0}
                max={900}
                value={e.rest}
                onChange={(v) => patch(i, { rest: Number(v.target.value) })}
              />
            </label>
            <label>
              Reps in reserve
              <input
                type="number"
                min={0}
                max={10}
                placeholder="Optional"
                value={e.rir ?? ""}
                onChange={(v) =>
                  patch(i, {
                    rir: v.target.value === "" ? null : Number(v.target.value),
                  })
                }
              />
            </label>
            <label>
              Unit
              <select
                value={e.unit}
                onChange={(v) =>
                  patch(i, { unit: v.target.value as "lb" | "kg" })
                }
              >
                <option>lb</option>
                <option>kg</option>
              </select>
            </label>
          </div>
          <details>
            <summary>Advanced prescription & cues</summary>
            <div className="training-fields">
              <label>
                Set style
                <select
                  value={e.type}
                  onChange={(v) =>
                    patch(i, { type: v.target.value as Exercise["type"] })
                  }
                >
                  {[
                    "working",
                    "warmup",
                    "top",
                    "backoff",
                    "drop",
                    "rest-pause",
                    "myo",
                    "timed",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Superset / circuit group
                <input
                  placeholder="A, B… same group pairs exercises"
                  value={e.group}
                  maxLength={40}
                  onChange={(v) => patch(i, { group: v.target.value })}
                />
              </label>
            </div>
            <label>
              Tempo, side, technique or substitution notes
              <textarea
                value={e.notes}
                maxLength={2000}
                onChange={(v) => patch(i, { notes: v.target.value })}
              />
            </label>
            <small>
              For mixed prescriptions, add separate exercise rows (for example,
              a top set and back-off sets). Enter each side as a separate row
              when tracking unilateral loads.
            </small>
          </details>
        </article>
      ))}
      <div className="training-library-search">
        <label>
          Find an exercise
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, muscle, equipment…"
          />
        </label>
        <div className="training-exercise-options">
          {EXERCISES.filter((e) =>
            e.join(" ").toLowerCase().includes(search.toLowerCase()),
          )
            .slice(0, 8)
            .map((e) => (
              <button
                key={e[0]}
                disabled={current.exercises.length >= 30}
                onClick={() => replace([...current.exercises, exercise(e[0])])}
              >
                <Plus size={13} />
                {e[0]}
                <small>{e[1]}</small>
              </button>
            ))}
          <button
            disabled={current.exercises.length >= 30}
            onClick={() =>
              replace([
                ...current.exercises,
                exercise(search || "Custom exercise"),
              ])
            }
          >
            <Plus size={13} />
            Add custom exercise
          </button>
        </div>
      </div>
      <label>
        Program notes
        <textarea
          value={p.notes}
          maxLength={2000}
          onChange={(e) => setP({ ...p, notes: e.target.value })}
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="training-save">
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const parsed = programSchema.safeParse(p);
              if (!parsed.success)
                throw new Error(parsed.error.issues[0].message);
              await onSave(parsed.data);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not save program.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Save size={16} />
          {busy ? "Saving…" : "Save program"}
        </button>
        <span>Review your prescription before starting a workout.</span>
      </div>
    </section>
  );
}
