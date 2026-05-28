import { Container } from "@/components/ui/Container"
import { AdminLoginClient } from "@/app/admin/login/AdminLoginClient"

export default function AdminLoginPage() {
  return (
    <div className="bg-white">
      <Container className="py-12 sm:py-16">
        <AdminLoginClient />
      </Container>
    </div>
  )
}
