"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ClientTabs from "@/components/layout/ClientTabs";
import ClientHeader from "@/components/layout/ClientHeader";

interface SplitTest {
  id: string;
  test_name: string;
  element_tested: string | null;
  control_rate: number | null;
  variation_rate: number | null;
  start_date: string | null;
  end_date: string | null;
  winner: string | null;
  implemented: boolean;
  notes: string | null;
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

function liftPct(control: number | null, variation: number | null) {
  if (!control || !variation) return null;
  return ((variation - control) / control) * 100;
}

export default function TestsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [tests, setTests] = useState<SplitTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SplitTest | null>(null);

  const emptyForm = {
    test_name: "",
    element_tested: "",
    control_rate: "",
    variation_rate: "",
    start_date: "",
    end_date: "",
    winner: "",
    implemented: false,
    notes: "",
  };
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/tests`);
    const data = await res.json();
    setTests(data.tests ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEdit = (t: SplitTest) => {
    setEditing(t);
    setForm({
      test_name: t.test_name,
      element_tested: t.element_tested ?? "",
      control_rate: t.control_rate != null ? String(t.control_rate) : "",
      variation_rate: t.variation_rate != null ? String(t.variation_rate) : "",
      start_date: t.start_date ?? "",
      end_date: t.end_date ?? "",
      winner: t.winner ?? "",
      implemented: t.implemented,
      notes: t.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const body = editing ? { ...form, id: editing.id } : form;
    const res = await fetch(`/api/clients/${clientId}/tests`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setForm(emptyForm);
      setEditing(null);
      setShowForm(false);
      load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    await fetch(`/api/clients/${clientId}/tests?id=${id}`, { method: "DELETE" });
    setTests((l) => l.filter((t) => t.id !== id));
  };

  const running = tests.filter((t) => !t.end_date).length;
  const withWinner = tests.filter((t) => t.winner && t.winner !== "inconclusive").length;
  const implemented = tests.filter((t) => t.implemented).length;

  return (
    <div className="space-y-6">
      <ClientHeader clientId={clientId} subtitle="Split Tests" />
      <ClientTabs clientId={clientId} />

      <div className="flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-xs text-gray-500">Running</p>
            <p className="text-2xl font-bold text-blue-700">{running}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">With Winner</p>
            <p className="text-2xl font-bold text-green-700">{withWinner}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Implemented</p>
            <p className="text-2xl font-bold text-gray-900">{implemented}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditing(null);
            setShowForm((v) => !v);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "Close" : "+ New Test"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-semibold text-gray-900">
            {editing ? "Edit Test" : "New Split Test"}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Test Name *">
              <input
                required
                value={form.test_name}
                onChange={(e) => setForm({ ...form, test_name: e.target.value })}
                className={inputClass}
                placeholder="Apr opt-in form"
              />
            </Field>
            <Field label="Element Tested">
              <input
                value={form.element_tested}
                onChange={(e) => setForm({ ...form, element_tested: e.target.value })}
                className={inputClass}
                placeholder="Remove last name field"
              />
            </Field>
            <Field label="Control Rate (0–1)">
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={form.control_rate}
                onChange={(e) => setForm({ ...form, control_rate: e.target.value })}
                className={inputClass}
                placeholder="0.1054"
              />
            </Field>
            <Field label="Variation Rate (0–1)">
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={form.variation_rate}
                onChange={(e) => setForm({ ...form, variation_rate: e.target.value })}
                className={inputClass}
                placeholder="0.1159"
              />
            </Field>
            <Field label="Start Date">
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="End Date">
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Winner">
              <select
                value={form.winner}
                onChange={(e) => setForm({ ...form, winner: e.target.value })}
                className={inputClass}
              >
                <option value="">— not yet —</option>
                <option value="control">Control</option>
                <option value="variation">Variation</option>
                <option value="inconclusive">Inconclusive</option>
              </select>
            </Field>
            <Field label="Implemented">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.implemented}
                  onChange={(e) => setForm({ ...form, implemented: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Winner rolled out
              </label>
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={inputClass}
            />
          </Field>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {editing ? "Update" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setForm(emptyForm);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm h-24 animate-pulse"
            />
          ))}
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-400">
          No split tests logged yet.
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => {
            const lift = liftPct(t.control_rate, t.variation_rate);
            return (
              <div
                key={t.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{t.test_name}</h3>
                    {t.element_tested && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        Testing: {t.element_tested}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {t.winner && (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          t.winner === "variation"
                            ? "bg-green-100 text-green-700"
                            : t.winner === "control"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {t.winner} wins
                      </span>
                    )}
                    {t.implemented && (
                      <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        Implemented
                      </span>
                    )}
                    {!t.end_date && (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        Running
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Control</p>
                    <p className="font-medium text-gray-900">{fmtPct(t.control_rate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Variation</p>
                    <p className="font-medium text-gray-900">{fmtPct(t.variation_rate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Lift</p>
                    <p
                      className={`font-medium ${
                        lift == null ? "text-gray-900" : lift > 0 ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {lift == null ? "—" : `${lift > 0 ? "+" : ""}${lift.toFixed(1)}%`}
                    </p>
                  </div>
                </div>

                {t.notes && (
                  <p className="mt-3 whitespace-pre-wrap text-xs text-gray-600">{t.notes}</p>
                )}

                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {t.start_date ? new Date(t.start_date).toLocaleDateString() : "—"}
                    {" → "}
                    {t.end_date ? new Date(t.end_date).toLocaleDateString() : "present"}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(t)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
