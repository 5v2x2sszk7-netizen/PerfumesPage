import { Container } from "@/components/ui/Container"
import { AdminClient } from "@/features/admin/AdminClient"

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-ink-50/40">
      <Container className="py-12 sm:py-16">
        <AdminClient />
      </Container>
    </div>
  )
}
