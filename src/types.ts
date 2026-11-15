export type OrderStatus = 'Booked' | 'In Progress' | 'Ready' | 'Partial Delivered' | 'Delivered';

export interface OrderItem {
  id: string;
  desc: string;
  qty: number;
  isDelivered: boolean;
}

export interface TailoringOrder {
  id: string;
  orderNo: string;
  customerName: string;
  phone: string;
  items: OrderItem[];
  totalAmount: number;
  advancePaid: number;
  balance: number;
  deliveryDate: string;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
}

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface FittingAppointment {
  id: string;
  name: string;
  phone: string;
  preferredDate: string;
  timeSlot: string;
  notes: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface CustomerReview {
  id: string;
  customerName: string;
  rating: number;
  service: string;
  comment: string;
  source: 'Google Business Profile' | 'Justdial Verified' | 'Boutique Counter' | 'Website Customer';
  visitDate: string;
  visible: boolean;
  featured: boolean;
  ownerReply?: string;
  createdAt: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviewsCount: number;
  googleProfileUrl: string;
  sourceNote: string;
}

export interface ShopDetails {
  businessName: string;
  tagline: string;
  address: string;
  landmark: string;
  city: string;
  pincode: string;
  phone: string;
  whatsappDigits: string;
  hours: string;
  announcement: string;
  googleBusinessUrl: string;
  googleMapsUrl: string;
  baseDirectoryRating: number;
  baseDirectoryReviewCount: number;
}

export interface GarmentOption {
  id: string;
  name: string;
  basePrice: number;
  category: 'Blouse' | 'Suit & Kurti' | 'Bridal & Gown';
}

export interface TurnaroundOption {
  id: string;
  name: string;
  fee: number;
  windowLabel: string;
}

export interface AddonOption {
  id: string;
  label: string;
  shortLabel: string;
  price: number;
}

export interface ServiceOffering {
  number: string;
  title: string;
  description: string;
  startingPrice: number;
  highlights: string[];
}

export interface MatchingRateItem {
  name: string;
  spec: string;
  rateRange: string;
  unit: string;
}

export interface DesignPattern {
  name: string;
  category: string;
  note: string;
}

export interface CatalogConfig {
  services: ServiceOffering[];
  designPatterns: DesignPattern[];
  matchingRates: MatchingRateItem[];
  estimatorGarments: GarmentOption[];
  estimatorTurnarounds: TurnaroundOption[];
  estimatorAddons: AddonOption[];
}

export interface AuthUser {
  businessId: string;
  ownerName: string;
}

export interface PublicBootstrapPayload {
  shopDetails: ShopDetails;
  catalog: CatalogConfig;
  reviews: CustomerReview[];
  reviewSummary: ReviewSummary;
}
