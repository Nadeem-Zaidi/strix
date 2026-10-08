import { useEffect, useRef, useState } from "react";
import { BookOpen, FileUp, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, ErrorNote, Field, Modal, Toggle } from "@/shared/ui/ui";
import { SKILL_TEMPLATES, skillsApi, type SkillInput, type SkillSummary } from "@/features/skills/api/skills_api";

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const NEW: SkillInput = { name: "", description: "", content: "", enabled: true };
// While typing: lowercase, invalid characters → "-" (a trailing dash stays,
// so "code-" can become "code-review"). Trimmed when leaving the field.
const slugTyping = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+/, "").slice(0, 64);
const slugFinal = (s: string) => slugTyping(s).replace(/-+$/, "");

// The user's skill library: reusable instructions any chat or agent can load
// when a task matches the skill's description.
export const SkillsPage = () => {
  const [skills, setSkills] = useState<SkillSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; form: SkillInput } | null>(null);
  const [deleting, setDeleting] = useState<SkillSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = () => skillsApi.list().then(setSkills).catch((e) => setError(errorText(e)));
  useEffect(() => { void load(); }, []);

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try { await task(); } catch (e) { setError(errorText(e)); } finally { setBusy(null); }
  };

  const openEditor = (s?: SkillSummary) => run(s ? `open:${s.id}` : "new", async () => {
    if (!s) return setEditing({ id: null, form: NEW });
    const full = await skillsApi.getSkill(s.id);
    setEditing({ id: s.id, form: { name: full.name, description: full.description, content: full.content, enabled: full.enabled } });
  });

  const toggle = (s: SkillSummary, enabled: boolean) => run(`toggle:${s.id}`, async () => {
    await skillsApi.update(s.id, { enabled });
    setSkills((list) => list?.map((x) => (x.id === s.id ? { ...x, enabled } : x)) ?? null);
  });

  const importFiles = (files: FileList | null) => {
    const list = [...(files ?? [])];
    if (!list.length) return;
    void run("import", async () => {
      for (const f of list) {
        if (f.size > 200_000) throw new Error(`${f.name} is too big for a skill`);
        await skillsApi.importMarkdown(await f.text(), f.name);
      }
      await load();
    });
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <div className="ag_page st_page">
      <header className="ag_page__header">
        <div>
          <h1 className="ag_page__title">Skills</h1>
          <p className="ag_page__subtitle">
            Reusable instructions — "how we write a Maximo FDD", "our code-review checklist". Every chat and agent sees the
            list; the assistant reads a skill only when your request matches its description, so a big library costs nothing extra.
          </p>
        </div>
        <div className="sk_head_actions">
          <input ref={fileInput} type="file" accept=".md,.markdown,.txt" multiple hidden onChange={(e) => importFiles(e.target.files)} />
          <Button onClick={() => fileInput.current?.click()} busy={busy === "import"}><FileUp size={15} /> Import SKILL.md</Button>
          <Button variant="primary" onClick={() => void openEditor()}><Plus size={15} /> New skill</Button>
        </div>
      </header>

      <ErrorNote message={error} />

      {skills === null ? (
        <div className="st_loading"><LoaderCircle size={18} className="spin" /> Loading…</div>
      ) : skills.length === 0 ? (
        <div className="sk_empty">
          <BookOpen size={22} />
          <div>
            <strong>No skills yet</strong>
            <p className="ag_muted">Write one, import a SKILL.md (the format Claude skills use), or start from a template:</p>
            <div className="sk_templates">
              {SKILL_TEMPLATES.map((t) => (
                <button key={t.name} type="button" className="ag_chip ag_chip--button" onClick={() => setEditing({ id: null, form: t })}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <ul className="sk_list">
          {skills.map((s) => (
            <li key={s.id} className={`sk_item ${s.enabled ? "" : "is_off"}`}>
              <div className="sk_item__main">
                <code className="sk_item__name">{s.name}</code>
                <span className="sk_item__desc">{s.description}</span>
                <span className="ag_muted ag_small">{(s.chars / 1000).toFixed(1)}k characters · updated {new Date(s.updated_at).toLocaleDateString()}</span>
              </div>
              <Toggle checked={s.enabled} onChange={(v) => void toggle(s, v)} label={s.enabled ? "On" : "Off"} disabled={busy === `toggle:${s.id}`} />
              <button type="button" className="ag_icon_btn" aria-label={`Edit ${s.name}`} disabled={busy === `open:${s.id}`} onClick={() => void openEditor(s)}><Pencil size={15} /></button>
              <button type="button" className="ag_icon_btn ag_icon_btn--danger" aria-label={`Delete ${s.name}`} onClick={() => setDeleting(s)}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <SkillDialog
          id={editing.id}
          initial={editing.form}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete "${deleting.name}"?`}
          message="Agents set to use this skill won't see it any more. This can't be undone."
          confirmLabel="Delete skill"
          busy={busy === "delete"}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void run("delete", async () => {
            await skillsApi.remove(deleting.id);
            setSkills((list) => list?.filter((x) => x.id !== deleting.id) ?? null);
            setDeleting(null);
          })}
        />
      )}
    </div>
  );
};

const SkillDialog = ({ id, initial, onClose, onSaved }: { id: string | null; initial: SkillInput; onClose: () => void; onSaved: () => void }) => {
  const [form, setForm] = useState<SkillInput>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof SkillInput>(k: K, v: SkillInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = { ...form, name: slugFinal(form.name) };
      if (id) await skillsApi.update(id, body);
      else await skillsApi.create(body);
      onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={id ? `Edit ${initial.name}` : "New skill"}
      subtitle="The description decides when the assistant uses it — say what kind of request it's for."
      onClose={onClose}
      wide
      footer={
        <>
          <ErrorNote message={error} />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" busy={saving} disabled={!form.name || !form.description.trim() || !form.content.trim()} onClick={() => void save()}>
            {id ? "Save" : "Create skill"}
          </Button>
        </>
      }
    >
      <div className="sk_form">
        <Field label="Name" hint="Lowercase, numbers and dashes — e.g. maximo-fdd">
          <input className="ag_input ag_mono" value={form.name} maxLength={64} placeholder="maximo-fdd" onChange={(e) => set("name", slugTyping(e.target.value))} onBlur={() => set("name", slugFinal(form.name))} />
        </Field>
        <Field label="When to use it" hint={`${form.description.length}/300`}>
          <input className="ag_input" value={form.description} maxLength={300} placeholder="Writing an IBM Maximo functional design document" onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Instructions (Markdown)" hint={`${form.content.length.toLocaleString()} / 50,000`}>
          <textarea className="ag_input ag_mono sk_content" value={form.content} maxLength={50_000} rows={16}
            placeholder={"# How we write an FDD\n\n1. Start with scope and assumptions\n2. …"} onChange={(e) => set("content", e.target.value)} />
        </Field>
        <Toggle checked={form.enabled} onChange={(v) => set("enabled", v)} label={form.enabled ? "On — available to chats and agents" : "Off"} />
      </div>
    </Modal>
  );
};
