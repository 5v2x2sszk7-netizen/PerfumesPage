"use client"

import dynamic from "next/dynamic"
import { LazyMount } from "@/components/ui/LazyMount"
import type { ReviewCarouselItem } from "@/lib/reviews"

const ReviewCarousel = dynamic(() => import("./ReviewCarousel").then((m) => m.ReviewCarousel), {
  ssr: false
})

export function ReviewCarouselLazy({ items }: { items: ReviewCarouselItem[] }) {
  return (
    <LazyMount fallback={<div className="h-[340px] w-full" aria-hidden="true" />}>
      <ReviewCarousel items={items} />
    </LazyMount>
  )
}

