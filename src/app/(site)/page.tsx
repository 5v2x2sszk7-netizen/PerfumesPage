import { readReviews } from "@/lib/perfumeStore"
import { readSellablePerfumes } from "@/lib/checkout/reservations"
import { HomeHeroSection } from "@/components/home/HomeHeroSection"
import { HomeFeaturedSection } from "@/components/home/HomeFeaturedSection"
import { HomeServiceSection } from "@/components/home/HomeServiceSection"
import { HomeReviewsSection } from "@/components/home/HomeReviewsSection"
import { buildReviewCarouselItems, getReviewRatingSummary } from "@/lib/reviews"

export const revalidate = 60

export default async function HomePage() {
  const perfumes = (await readSellablePerfumes()).filter((p) => p.stock > 0)
  const featured = perfumes.slice(0, 3)
  const reviews = await readReviews()
  const carouselItems = buildReviewCarouselItems(reviews, 12)
  const { ratingCount, avgRatingLabel, roundedStars } = getReviewRatingSummary(reviews)

  return (
    <div>
      <HomeHeroSection />
      <HomeFeaturedSection featured={featured} />
      <HomeServiceSection />
      <HomeReviewsSection
        reviews={reviews}
        carouselItems={carouselItems}
        ratingCount={ratingCount}
        avgRatingLabel={avgRatingLabel}
        roundedStars={roundedStars}
      />
    </div>
  )
}
