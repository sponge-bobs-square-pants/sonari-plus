import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { logout, selectAuthUser } from '../../features/auth/authSlice'
import Icon from '../../components/ui/Icon'
import AdminPageShell from '../../components/admin/AdminPageShell'

/* The places an admin can go from the hub. Add a card here as the panel
   grows — no other layout changes needed. */
const OPTIONS = [
  {
    to: '/admin/orders',
    icon: 'bag',
    title: 'Orders',
    body: 'Every order placed in the store — payment status, customer and fulfilment at a glance.',
  },
  {
    to: '/admin/bills',
    icon: 'doc',
    title: 'Bills',
    body: 'Every Bill of Supply, totalled by date range — the turnover figures for the GST return.',
  },
  {
    to: '/admin/products',
    icon: 'box',
    title: 'Add & manage products',
    body: 'Build your catalogue — add new pieces, edit details, upload images, remove what is sold out.',
  },
  {
    to: '/admin/landing',
    icon: 'layout',
    title: 'Configure landing page',
    body: 'Control what the homepage shows — the hero, featured pieces and section order.',
  },
]

// Shared tile chrome — used by the nav cards and the sign-out card alike.
const TILE =
  'group border border-canvas/15 p-8 transition-colors duration-300 hover:border-canvas/50'

/* The inner content of a dashboard tile — an icon, a title, a blurb and a
   growing-line call to action. Wrapped by a <Link> or a <button>. */
function TileBody({ icon, title, body, cta }) {
  return (
    <>
      <Icon name={icon} className="h-8 w-8 text-canvas" />
      <h2 className="mt-6 font-display text-xl font-light text-canvas">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-canvas/55">{body}</p>
      <span className="eyebrow mt-7 inline-flex items-center gap-2 text-canvas">
        <span className="h-px w-6 bg-canvas transition-all duration-300 group-hover:w-10" />
        {cta}
      </span>
    </>
  )
}

export default function AdminDashboard() {
  const user = useSelector(selectAuthUser)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await dispatch(logout())
    navigate('/')
  }

  return (
    <AdminPageShell backTo="/" backLabel="Storefront" dark fit>
      <p className="eyebrow text-dusk">Dashboard</p>
      <h1 className="mt-2 font-display text-4xl font-light tracking-tight text-canvas">
        Welcome, {user?.name?.split(' ')[0]}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-canvas/55">
        Manage your store from here — choose where you'd like to go.
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <Link key={o.to} to={o.to} className={TILE}>
            <TileBody icon={o.icon} title={o.title} body={o.body} cta="Open" />
          </Link>
        ))}

        {/* Sign out — an action rather than a destination, but tiled here
            too so the grid sits as an even 2 × 2. */}
        <button
          type="button"
          onClick={handleSignOut}
          className={`${TILE} cursor-pointer bg-transparent text-left`}
        >
          <TileBody
            icon="user"
            title="Sign out"
            body="End this admin session and head back to the storefront."
            cta="Sign out"
          />
        </button>
      </div>
    </AdminPageShell>
  )
}
