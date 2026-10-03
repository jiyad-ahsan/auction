import { createTagAction, updateTagAction } from "@/app/actions/admin";
import { query } from "@/lib/db";

const ERRORS: Record<string, string> = {
  tag: "A tag needs a name of at least 2 characters.",
  tag_exists: "A tag with that name already exists.",
};

export default async function Tags({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const tags = await query<{ id: string; slug: string; label: string; description: string | null; active: boolean; n: number }>(
    `select t.*, (select count(*)::int from watch_tags wt where wt.tag_id = t.id) as n from tags t order by t.active desc, t.label`,
  );
  return (
    <>
      <h1>Tags</h1>
      <p className="muted">Tags describe watches on their listing and let buyers filter the catalogue. Turning a tag off hides it everywhere without removing it from watches.</p>
      {error && <div className="notice bad">{ERRORS[error]}</div>}
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Tag</th><th>Description</th><th>Watches</th><th>Shown</th><th></th></tr></thead>
        <tbody>
          {tags.map((t) => (
            <tr key={t.id}>
              <td colSpan={5} style={{ padding: 0 }}>
                <form action={updateTagAction} className="inline" style={{ width: "100%", padding: "8px 0" }}>
                  <input type="hidden" name="tag_id" value={t.id} />
                  <input name="label" defaultValue={t.label} aria-label="Tag name" size={18} />
                  <input name="description" defaultValue={t.description ?? ""} aria-label="Description" size={34} placeholder="Description" />
                  <span className="num small" style={{ minWidth: 70 }}>{t.n} watch{t.n === 1 ? "" : "es"}</span>
                  <label className="checkrow"><input type="checkbox" name="active" defaultChecked={t.active} /> Shown</label>
                  <span className="mono small muted">{t.slug}</span>
                  <button className="secondary">Save</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <h2>New tag</h2>
      <form action={createTagAction} className="stack">
        <div className="row">
          <label>Name<input name="label" placeholder="e.g. Tropical dial" required /></label>
          <label>Description (optional)<input name="description" /></label>
        </div>
        <button>Add tag</button>
      </form>
    </>
  );
}
