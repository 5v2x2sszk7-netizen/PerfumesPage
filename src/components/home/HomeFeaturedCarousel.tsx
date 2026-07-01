"use client"

import { useEffect, useRef, useState } from "react"
import { LazyReveal } from "@/components/ui/LazyReveal"
import { PerfumeCard } from "@/components/perfume/PerfumeCard"
import type { Perfume } from "@/types/perfume"

export function HomeFeaturedCarousel({ featured }: { featured: Perfume[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const [, setActiveIndex] = useState(0)

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, featured.length)
  }, [featured.length])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || featured.length <= 1) return

    const handleScroll = () => {
      if (window.innerWidth >= 768) return

      const scrollerLeft = scroller.getBoundingClientRect().left
      let closestIdx = 0
      let closestDistance = Number.POSITIVE_INFINITY

      itemRefs.current.forEach((item, idx) => {
        if (!item) return
        const distance = Math.abs(item.getBoundingClientRect().left - scrollerLeft)
        if (distance < closestDistance) {
          closestDistance = distance
          closestIdx = idx
        }
      })

      setActiveIndex((current) => (current === closestIdx ? current : closestIdx))
    }

    scroller.addEventListener("scroll", handleScroll, { passive: true })
    return () => scroller.removeEventListener("scroll", handleScroll)
  }, [featured.length])

  useEffect(() => {
    if (featured.length <= 1) return

    const media = window.matchMedia("(max-width: 767px)")
    let intervalId: number | null = null

    const startAutoPlay = () => {
      if (!media.matches) return
      if (intervalId != null) window.clearInterval(intervalId)

      intervalId = window.setInterval(() => {
        setActiveIndex((current) => {
          const next = (current + 1) % featured.length
          itemRefs.current[next]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
          return next
        })
      }, 3600)
    }

    const stopAutoPlay = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId)
        intervalId = null
      }
    }

    const handleMediaChange = () => {
      if (media.matches) {
        startAutoPlay()
        return
      }

      stopAutoPlay()
      setActiveIndex(0)
      scrollerRef.current?.scrollTo({ left: 0, behavior: "smooth" })
    }

    startAutoPlay()
    media.addEventListener("change", handleMediaChange)

    return () => {
      stopAutoPlay()
      media.removeEventListener("change", handleMediaChange)
    }
  }, [featured.length])

  return (
    <div
      ref={scrollerRef}
      className="scrollbar-none flex max-w-full snap-x snap-mandatory gap-4 overflow-x-auto pb-1 pr-6 md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:pr-0 lg:grid-cols-3 xl:grid-cols-4"
    >
      {featured.map((perfume, idx) => (
        <div
          key={perfume.id}
          ref={(node) => {
            itemRefs.current[idx] = node
          }}
          className="w-[min(328px,86vw)] shrink-0 snap-start sm:w-[360px] md:w-full md:shrink md:snap-none"
        >
          <LazyReveal className="w-full" delayMs={idx * 120}>
            <PerfumeCard perfume={perfume} variant="featured" />
          </LazyReveal>
        </div>
      ))}
    </div>
  )
}
