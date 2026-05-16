import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { selectAuthUser } from '../../features/auth/authSlice'
import Icon from '../../components/ui/Icon'
import AdminPageShell from '../../components/admin/AdminPageShell'

/* The two things an admin can do from the hub. Add a card here as
   the panel grows — no other layout changes needed. */
const OPTIONS = [
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

export default function AdminDashboard() {
  const user = useSelector(selectAuthUser)

  return (
    <AdminPageShell backTo="/" backLabel="Storefront" dark>
      <p className="eyebrow text-dusk">Dashboard</p>
      <h1 className="mt-2 font-display text-4xl font-light tracking-tight text-canvas">
        Welcome, {user?.name?.split(' ')[0]}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-canvas/55">
        Manage your store from here — choose where you'd like to go.
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <Link
            key={o.to}
            to={o.to}
            className="group border border-canvas/15 p-8 transition-colors duration-300 hover:border-canvas/50"
          >
            <Icon name={o.icon} className="h-8 w-8 text-canvas" />
            <h2 className="mt-6 font-display text-xl font-light text-canvas">
              {o.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-canvas/55">
              {o.body}
            </p>
            <span className="eyebrow mt-7 inline-flex items-center gap-2 text-canvas">
              <span className="h-px w-6 bg-canvas transition-all duration-300 group-hover:w-10" />
              Open
            </span>
          </Link>
        ))}
      </div>
    </AdminPageShell>
  )
}
