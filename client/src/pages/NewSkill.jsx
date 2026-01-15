import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/http";
import InlineError from "../components/InLineError";

export default function NewSkill() {
  const nav = useNavigate();

  const [type, setType] = useState("offer");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState("public");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (saving) return;

    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setSaving(true);
    try {
      await api("/api/skills", {
        method: "POST",
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          tags: tags.trim(),
          visibility,
        }),
      });
      nav("/skills");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Create Skill</h1>
      <p className="text-slate-600 mt-1">
        Add a skill you offer or a skill you’re looking for.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="offer">Offer (I can teach)</option>
              <option value="seek">Request (I need help)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Visibility</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="public">Public</option>
              <option value="private">Private (only you / admin)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Title</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="Ex: Algebra II help, Photoshop basics, Guitar chords..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Description</label>
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2"
            rows={4}
            placeholder="What exactly can you help with? Availability, level, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Tags</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="Comma-separated: math, algebra, tutoring"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        {/* Inline standardized error */}
        <InlineError message={error} />

        <button
          disabled={saving}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Create Skill"}
        </button>
      </form>
    </div>
  );
}
