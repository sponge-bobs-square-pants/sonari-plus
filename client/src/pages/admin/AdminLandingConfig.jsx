import AdminPageShell from '../../components/admin/AdminPageShell'

/**
 * Placeholder for the landing-page configuration tool.
 * Scope to be defined — what the admin should control on the homepage.
 */
export default function AdminLandingConfig() {
  return (
    <AdminPageShell backTo="/admin" backLabel="Dashboard">
      <p className="eyebrow text-clay">Landing page</p>
      <h1 className="mt-2 font-display text-4xl font-light tracking-tight text-ink">
        Configure your homepage
      </h1>

      <div className="mt-12 border-y border-linen py-20 text-center">
        <p className="font-display text-2xl font-light text-ink">Coming soon</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-clay">
          This is where you'll choose the hero, the featured collection and the
          order of homepage sections. Tell me what you'd like to control and
          we'll build it.
        </p>
      </div>
    </AdminPageShell>
  )
}
