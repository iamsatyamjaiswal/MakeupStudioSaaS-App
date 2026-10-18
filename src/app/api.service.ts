import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../environments/environment";
import { Observable } from "rxjs";

export interface PublicServiceDto {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  priceMode: string;
  durationMinutes?: number | null;
  coverImageUrl?: string | null;
  isActive?: boolean;
  isPublished?: boolean;
}
export interface BookingRequestDto {
  customerName: string;
  phone: string;
  email?: string;
  serviceId: string;
  appointmentAt: string;
  notes?: string;
}
export interface ServiceRequestDto {
  name: string;
  category: string;
  description: string;
  price: number;
  priceMode: string;
  durationMinutes?: number | null;
  coverImageUrl?: string | null;
  isActive: boolean;
  isPublished: boolean;
}
export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: {
    id: string;
    displayName: string;
    email: string;
    tenantId: string | null;
    roles: string[];
  };
}
export interface BookingDto {
  id: string;
  tenantId: string;
  serviceId: string | null;
  customerName: string;
  phone: string;
  email?: string | null;
  customerAddress?: string | null;
  appointmentAt: string;
  priceSnapshot: number;
  discountAmount: number;
  paidAmount?: number;
  balanceDue?: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  modifiedAt?: string | null;
  serviceName?: string | null;
  requestSource?: string;
  assignedArtist?: string | null;
  eventType?: string | null;
  eventDate?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
}
export interface StudioBookingRequest {
  customerName: string;
  phone: string;
  email?: string | null;
  customerAddress?: string | null;
  serviceId?: string | null;
  appointmentAt: string;
  priceSnapshot: number;
  discountAmount: number;
  notes?: string | null;
  assignedArtist?: string | null;
  eventType?: string | null;
  eventDate?: string | null;
}
export interface BookingPaymentDto {
  id: string;
  bookingId: string;
  amount: number;
  paymentMode: string;
  reference?: string | null;
  notes?: string | null;
  receivedAt: string;
}
export interface BookingPaymentRequest {
  amount: number;
  paymentMode: string;
  reference?: string | null;
  notes?: string | null;
  receivedAt: string;
}
export interface BookingHistoryDto {
  id: string;
  action: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  oldAppointmentAt?: string | null;
  newAppointmentAt?: string | null;
  remark?: string | null;
  actorName?: string | null;
  createdAt: string;
}
export interface TenantDto {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  createdAt: string;
}
export interface SiteDto {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor: string;
  currency: string;
}
export interface PostDto {
  id: string;
  title: string;
  slug: string;
  body: string;
  coverImageUrl?: string | null;
  status: string;
  publishedAt?: string | null;
  createdAt: string;
}
export interface MonthlyReportDto {
  month: string;
  label: string;
  bookings: number;
  completedRevenue: number;
}
export interface StudioReportDto {
  generatedAt: string;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  upcomingBookings: number;
  completedRevenue: number;
  publishedServices: number;
  totalServices: number;
  monthly: MonthlyReportDto[];
  statusCounts: { status: string; count: number }[];
  servicePerformance: {
    serviceId: string;
    serviceName: string;
    active: boolean;
    published: boolean;
    bookings: number;
    completedRevenue: number;
  }[];
  recentActivity: {
    action: string;
    entityType: string;
    entityId?: string | null;
    createdAt: string;
  }[];
}
export interface PlatformReportDto {
  generatedAt: string;
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalBookings: number;
  bookingsLast30Days: number;
  completedRevenue: number;
  monthly: MonthlyReportDto[];
  tenantPerformance: {
    id: string;
    name: string;
    slug: string;
    status: string;
    plan: string;
    bookings: number;
    completedRevenue: number;
  }[];
}

@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;
  health(): Observable<{ status: string; service: string; utc: string }> {
    return this.http.get<{ status: string; service: string; utc: string }>(
      `${this.base}/health`,
    );
  }
  getSite(slug: string): Observable<SiteDto> {
    return this.http.get<SiteDto>(
      `${this.base}/public/sites/${encodeURIComponent(slug)}`,
    );
  }
  getPublicServices(slug: string): Observable<PublicServiceDto[]> {
    return this.http.get<PublicServiceDto[]>(
      `${this.base}/public/services`,
      { params: { slug } },
    );
  }
  getPublicPosts(slug: string): Observable<PostDto[]> {
    return this.http.get<PostDto[]>(`${this.base}/public/posts`, {
      params: { slug },
    });
  }
  createBooking(
    slug: string,
    request: BookingRequestDto,
  ): Observable<{
    id: string;
    status: string;
    priceSnapshot: number;
    appointmentAt: string;
  }> {
    return this.http.post<{
      id: string;
      status: string;
      priceSnapshot: number;
      appointmentAt: string;
    }>(
      `${this.base}/public/bookings?slug=${encodeURIComponent(slug)}`,
      request,
    );
  }
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, {
      email,
      password,
    });
  }
  getMe(): Observable<unknown> {
    return this.http.get(`${this.base}/auth/me`);
  }
  getAdminServices(): Observable<PublicServiceDto[]> {
    return this.http.get<PublicServiceDto[]>(`${this.base}/admin/services`);
  }
  createAdminService(
    request: ServiceRequestDto,
  ): Observable<PublicServiceDto> {
    return this.http.post<PublicServiceDto>(
      `${this.base}/admin/services`,
      request,
    );
  }
  updateAdminService(
    id: string,
    request: ServiceRequestDto,
  ): Observable<PublicServiceDto> {
    return this.http.put<PublicServiceDto>(
      `${this.base}/admin/services/${id}`,
      request,
    );
  }
  deleteAdminService(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/services/${id}`);
  }
  getBookings(): Observable<BookingDto[]> {
    return this.http.get<BookingDto[]>(`${this.base}/admin/bookings`);
  }
  getStudioReport(): Observable<StudioReportDto> {
    return this.http.get<StudioReportDto>(
      `${this.base}/admin/reports/summary`,
    );
  }
  createWalkInBooking(request: StudioBookingRequest): Observable<BookingDto> {
    return this.http.post<BookingDto>(
      `${this.base}/admin/bookings`,
      request,
    );
  }
  updateBookingDetails(
    id: string,
    request: StudioBookingRequest,
  ): Observable<BookingDto> {
    return this.http.put<BookingDto>(
      `${this.base}/admin/bookings/${id}`,
      request,
    );
  }
  updateBookingStatus(
    id: string,
    status: string,
    remark?: string,
    cancellationReason?: string,
  ): Observable<unknown> {
    let params = new HttpParams().set("status", status);
    if (remark) params = params.set("remark", remark);
    if (cancellationReason)
      params = params.set("cancellationReason", cancellationReason);
    return this.http.patch(
      `${this.base}/admin/bookings/${id}/status`,
      {},
      { params },
    );
  }
  getBookingPayments(id: string): Observable<BookingPaymentDto[]> {
    return this.http.get<BookingPaymentDto[]>(
      `${this.base}/admin/bookings/${id}/payments`,
    );
  }
  addBookingPayment(
    id: string,
    request: BookingPaymentRequest,
  ): Observable<BookingPaymentDto> {
    return this.http.post<BookingPaymentDto>(
      `${this.base}/admin/bookings/${id}/payments`,
      request,
    );
  }
  getBookingHistory(id: string): Observable<BookingHistoryDto[]> {
    return this.http.get<BookingHistoryDto[]>(
      `${this.base}/admin/bookings/${id}/history`,
    );
  }
  getAdminPosts(): Observable<PostDto[]> {
    return this.http.get<PostDto[]>(`${this.base}/admin/posts`);
  }
  createAdminPost(request: {
    title: string;
    body: string;
    coverImageUrl?: string | null;
    status: string;
  }): Observable<PostDto> {
    return this.http.post<PostDto>(`${this.base}/admin/posts`, request);
  }
  updateAdminPost(
    id: string,
    request: {
      title: string;
      body: string;
      coverImageUrl?: string | null;
      status: string;
    },
  ): Observable<PostDto> {
    return this.http.put<PostDto>(
      `${this.base}/admin/posts/${id}`,
      request,
    );
  }
  deleteAdminPost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/posts/${id}`);
  }
  getTenants(): Observable<TenantDto[]> {
    return this.http.get<TenantDto[]>(`${this.base}/superadmin/tenants`);
  }
  getPlatformReport(): Observable<PlatformReportDto> {
    return this.http.get<PlatformReportDto>(
      `${this.base}/superadmin/reports/summary`,
    );
  }
  createTenant(request: {
    name: string;
    slug: string;
    plan: string;
    adminEmail: string;
    adminPassword: string;
  }): Observable<TenantDto> {
    return this.http.post<TenantDto>(
      `${this.base}/superadmin/tenants`,
      request,
    );
  }
  updateTenantStatus(id: string, status: string): Observable<unknown> {
    return this.http.patch(
      `${this.base}/superadmin/tenants/${id}/status`,
      {},
      { params: new HttpParams().set("status", status) },
    );
  }
}
