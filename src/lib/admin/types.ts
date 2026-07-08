import type { Perfume } from "@/types/perfume"
import type { Review as StoreReview } from "@/lib/perfumeStore"

export type Draft = {
  id?: string
  name: string
  brand: string
  category: Perfume["category"]
  description: string
  sizeMl: string
  price: string
  cost: string
  stock: string
  availability: Perfume["availability"]
  imageGallery: string[]
  notesTop: string
  notesHeart: string
  notesBase: string
}

export type AdminSection = "products" | "form" | "report" | "orders" | "reviews"

export type Suggestions = {
  brands: string[]
  namesByBrand: Record<string, string[]>
}

export type SaleRecord = {
  id: string
  at: string
  perfumeId: string
  brand: string
  name: string
  sizeMl: number
  unitPrice: number
  unitCost: number
  qty: number
}

export type ConfirmedOrderCustomer = {
  fullName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2?: string
  neighborhood?: string
  city: string
  state: string
  postalCode: string
  notes?: string
}

export type ConfirmedOrderItem = {
  perfumeId: string
  brand: string
  name: string
  sizeMl: number
  unitPrice: number
  unitCost: number
  quantity: number
}

export type ConfirmedOrderRecord = {
  id: string
  provider: "mercado_pago" | "paypal"
  checkoutMode?: "guest" | "account"
  customerId?: string
  createdAt: string
  completedAt: string
  paymentStatus: string
  fulfillmentStatus?: string
  paymentReference: string
  customer: ConfirmedOrderCustomer
  subtotal: number
  shippingAmount: number
  shippingLabel?: string
  total: number
  items: ConfirmedOrderItem[]
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
  shippedAt?: string
  shippingStatus?: "pending" | "shipped" | "delivered"
}

export type CheckoutReservationRecord = {
  id: string
  provider: "mercado_pago" | "paypal"
  checkoutMode?: "guest" | "account"
  customerId?: string
  status: "pending" | "completed" | "inventory_rejected"
  createdAt: string
  reservationExpiresAt?: string
  reservationReleasedAt?: string
  reservationReleaseReason?: "manual" | "expired_cleanup"
  completedAt?: string
  paymentStatus?: string
  fulfillmentStatus?: string
  paymentReference?: string
  customer: ConfirmedOrderCustomer
  subtotal: number
  shippingAmount: number
  shippingLabel?: string
  total: number
  items: ConfirmedOrderItem[]
  events?: CheckoutReservationEvent[]
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
  shippedAt?: string
  shippingStatus?: "pending" | "shipped" | "delivered"
}

export type CheckoutReservationEvent = {
  type:
    | "reservation_created"
    | "checkout_started"
    | "reservation_released"
    | "payment_confirmed"
    | "inventory_rejected"
    | "critical_alert_sent"
    | "fulfillment_updated"
  at: string
  detail?: string
}

export type ReservationEventLogEntry = {
  reservationId: string
  provider: "mercado_pago" | "paypal"
  reservationStatus: "pending" | "completed" | "inventory_rejected"
  isReservationActive: boolean
  customerName: string
  customerEmail: string
  event: CheckoutReservationEvent
  itemsSummary: string
}

export type ReservationMetrics = {
  total: number
  active: number
  expiringSoon: number
  criticalAlertSent: number
  criticalAlertPending: number
  expiredPending: number
  completed: number
  inventoryRejected: number
  manuallyReleased: number
  cleanupReleased: number
  conversionRate: number
  expirationRate: number
  rejectionRate: number
}

export type Review = StoreReview

export type ReviewDraft = {
  customerName: string
  text: string
  rating: string
  imageSrc: string
}

export const emptyDraft: Draft = {
  name: "",
  brand: "",
  category: "niche",
  description: "",
  sizeMl: "",
  price: "",
  cost: "",
  stock: "1",
  availability: "in_stock",
  imageGallery: ["", "", "", "", "", ""],
  notesTop: "",
  notesHeart: "",
  notesBase: ""
}

export const emptyReviewDraft: ReviewDraft = {
  customerName: "",
  text: "",
  rating: "",
  imageSrc: ""
}
