import { Container } from "@/components/ui/Container"
import { AdminLoginClient } from "@/app/admin/login/AdminLoginClient"
import { Suspense } from "react"
import { Card } from "@/components/ui/Surface"

export default function AdminLoginPage() {
  return (
    <div className="bg-white">
      <Container className="py-12 sm:py-16">
        <Suspense
          fallback={
            <Card className="shimmer mx-auto h-64 w-full max-w-lg p-6" aria-hidden="true" />
          }
        >
          <AdminLoginClient />
        </Suspense>
      </Container>
    </div>
  )
}
