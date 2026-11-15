export type OrderStatus = 'Booked' | 'In Progress' | 'Ready' | 'Delivered';

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

export interface AuthUser {
  businessId: string;
  ownerName: string;
}

export interface PublicBootstrapPayload {
  shopDetails: ShopDetails;
  reviews: CustomerReview[];
  reviewSummary: ReviewSummary;
}
