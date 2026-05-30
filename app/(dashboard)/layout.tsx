import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Sidebar from '@/components/sidebar'
import TopBar from '@/components/topbar'
import { ToastProvider } from '@/components/toast'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  return (
    <ToastProvider>
      <Sidebar
        userEmail={session.email}
        userName={session.name ?? undefined}
        userRole={session.role}
      />
      <div className="dashboard-content">
        <TopBar />
        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
