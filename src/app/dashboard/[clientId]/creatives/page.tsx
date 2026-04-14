"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ClientTabs from "@/components/layout/ClientTabs";
import ClientHeader from "@/components/layout/ClientHeader";

interface Creative {
  id: string;
  ad_name: string;
  utm_content: string | null;
  creative_type: string;
  concept_name: string | null;
  hook_summary: string | null;
  thumbnail_url: string | null;
  notes: string | null;
  created_at: string;
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function ClientCreativesPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Creative | null>(null);

  const emptyForm = {
    ad_name: "",
    utm_content: "",
    creative_type: "video",
    concept_name: "",
    hook_summary: "",
    thumbnail_url: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/creatives`);
    const data = await res.json();
    setCreatives(data.creatives ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const body = editing ? { ...form, id: editing.id } : form;
    const res = await fetch(`/api/clients/${clientId}/creatives`, {
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

  const handleEdit = (c: Creative) => {
    setEditing(c);
    setForm({
      ad_name: c.ad_name,
      utm_content: c.utm_content ?? "",
      creative_type: c.creative_type,
      concept_name: c.concept_name ?? "",
      hook_summary: c.hook_summary ?? "",
      thumbnail_url: c.thumbnail_url ?? "",
      notes: c.notes ?? "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this creative?")) return;
    await fetch(`/api/clients/${clientId}/creatives?id=${id}`, { method: "DELETE" });
    setCreatives((l) => l.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <ClientHeader clientId={clientId} subtitle="Creatives" />
      <ClientTabs clientId={clientId} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Organize ad creatives with hooks, concepts, and attribution to utm_content.
        </p>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditing(null);
            setShowForm((v) => !v);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "Close" : "+ Add Creative"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-semibold text-gray-900">
            {editing ? "Edit Creative" : "Add Creative"}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Ad Name *">
              <input
                required
                value={form.ad_name}
                onChange={(e) => setForm({ ...form, ad_name: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="utm_content">
              <input
                value={form.utm_content}
                onChange={(e) => setForm({ ...form, utm_content: e.target.value })}
                className={inputClass}
                placeholder="lambo-facetime"
              />
            </Field>
            <Field label="Type">
              <select
                value={form.creative_type}
                onChange={(e) => setForm({ ...form, creative_type: e.target.value })}
                className={inputClass}
              >
                <option value="video">Video</option>
                <option value="image">Image</option>
                <option value="carousel">Carousel</option>
              </select>
            </Field>
            <Field label="Concept Name">
              <input
                value={form.concept_name}
                onChange={(e) => setForm({ ...form, concept_name: e.target.value })}
                className={inputClass}
                placeholder="Facetime proof"
              />
            </Field>
            <Field label="Thumbnail URL">
              <input
                value={form.thumbnail_url}
                onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                className={inputClass}
                placeholder="https://…"
              />
            </Field>
            <Field label="Hook Summary">
              <input
                value={form.hook_summary}
                onChange={(e) => setForm({ ...form, hook_summary: e.target.value })}
                className={inputClass}
                placeholder="POV on FaceTime while driving"
              />
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="h-40 w-full animate-pulse rounded bg-gray-100" />
              <div className="mt-3 h-4 w-32 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : creatives.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-gray-500">
          No creatives yet. Add one to start building your library.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creatives.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded bg-gray-100">
                {c.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.thumbnail_url}
                    alt={c.ad_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-400">No thumbnail</span>
                )}
              </div>
              <div className="mt-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{c.ad_name}</p>
                    {c.concept_name && (
                      <p className="text-xs text-gray-500">{c.concept_name}</p>
                    )}
                  </div>
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {c.creative_type}
                  </span>
                </div>
                {c.hook_summary && (
                  <p className="mt-2 text-xs text-gray-600">&ldquo;{c.hook_summary}&rdquo;</p>
                )}
                {c.utm_content && (
                  <p className="mt-2 font-mono text-xs text-gray-500">{c.utm_content}</p>
                )}
                {c.notes && (
                  <p className="mt-2 text-xs text-gray-500 line-clamp-2">{c.notes}</p>
                )}
                <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3 text-xs">
                  <button
                    onClick={() => handleEdit(c)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
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
