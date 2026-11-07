import AdminClient from './admin-client'

export const metadata = {
  title: 'Admin — PassGram',
  description: 'PassGram administration.',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <AdminClient />
}
