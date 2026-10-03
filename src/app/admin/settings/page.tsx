import { updateSettingsAction } from "@/app/actions/admin";
import { requireStaff } from "@/lib/auth";
import { settings } from "@/lib/settings";

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const staff = await requireStaff();
  const { saved } = await searchParams;
  const s = await settings();
  const canEdit = staff.role === "admin";
  return (
    <>
      <h1>Settings</h1>
      {saved && <div className="notice good">Settings saved.</div>}
      <form action={updateSettingsAction} className="stack">
        <fieldset disabled={!canEdit}>
          <legend>Pilot mode</legend>
          <label className="checkrow"><input type="checkbox" name="pilot_mode" defaultChecked={s.pilot_mode} /> Pilot mode</label>
          <p className="muted small" style={{ margin: 0 }}>
            On: bidders need a verified phone and email, bid limits are set by staff, and the CNIC is checked before collection.
            Off: bidders need a verified CNIC and a refundable deposit before they can bid.
          </p>
          <label className="checkrow"><input type="checkbox" name="invite_only" defaultChecked={s.invite_only} /> Invite-only sign-up</label>
        </fieldset>
        <fieldset disabled={!canEdit}>
          <legend>Benchmark</legend>
          <label>
            Seller&apos;s normal sell rate for the same stock (%)
            <input name="baseline_sell_through_pct" inputMode="decimal" defaultValue={s.baseline_sell_through_pct ?? ""} placeholder="e.g. 20" />
          </label>
          <p className="muted small" style={{ margin: 0 }}>Shown next to auction sell-through on the dashboard.</p>
        </fieldset>
        {canEdit ? <button>Save settings</button> : <p className="muted small">Only admins can change settings.</p>}
      </form>
    </>
  );
}
