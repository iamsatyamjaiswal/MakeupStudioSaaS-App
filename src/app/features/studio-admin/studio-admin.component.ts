import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { catchError, finalize, map, of, switchMap } from "rxjs";
import {
  ApiService,
  BookingDto,
  BookingHistoryDto,
  BookingPaymentDto,
  BookingPaymentRequest,
  StudioBookingRequest,
  PostDto,
  PublicServiceDto,
  ServiceRequestDto,
  StudioReportDto,
} from "../../api.service";
import { AuthService } from "../../core/auth/auth.service";

@Component({
  selector: "app-studio-admin",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./studio-admin.component.html",
})
export class StudioAdminComponent implements OnInit {
  email = "admin@jjmakeup.local";
  password = "DevOnly!ChangeMe2026";
  loginError = "";
  error = "";
  notice = "";
  loading = false;
  saving = false;
  loginPending = false;
  activeTab:
    | "overview"
    | "services"
    | "bookings"
    | "confirmed"
    | "content"
    | "reports" = "overview";
  report: StudioReportDto | null = null;
  services: PublicServiceDto[] = [];
  bookings: BookingDto[] = [];
  posts: PostDto[] = [];
  serviceForm: ServiceRequestDto = this.emptyService();
  editingServiceId: string | null = null;
  postTitle = "";
  postBody = "";
  postImage = "";
  postStatus = "Draft";
  editingPostId: string | null = null;
  bookingSaving = false;
  showWalkInForm = false;
  editingBookingId: string | null = null;
  selectedBooking: BookingDto | null = null;
  bookingPayments: BookingPaymentDto[] = [];
  bookingHistory: BookingHistoryDto[] = [];
  paymentSaving = false;
  bookingForm: StudioBookingRequest = this.emptyBookingForm();
  paymentForm: BookingPaymentRequest = this.emptyPaymentForm();
  bookingSearch = "";
  bookingStatusFilter = "All";
  cancellationReason = "";
  initialAdvanceAmount = 0;
  initialPaymentMode = "Cash";
  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
  ) { }
  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const email = params.get("email");
      if (
        email &&
        (!this.auth.isAuthenticated() ||
          !this.auth.hasRole("StudioAdmin"))
      )
        this.email = email;
    });
    if (this.auth.isAuthenticated() && this.auth.hasRole("StudioAdmin"))
      this.loadAll();
  }
  emptyBookingForm(): StudioBookingRequest {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return {
      customerName: "",
      phone: "",
      email: "",
      customerAddress: "",
      serviceId: null,
      appointmentAt: this.toLocalDateTimeInput(d),
      priceSnapshot: 0,
      discountAmount: 0,
      notes: "",
      assignedArtist: "",
      eventType: "",
      eventDate: null,
    };
  }
  emptyPaymentForm(): BookingPaymentRequest {
    return {
      amount: 0,
      paymentMode: "Cash",
      reference: "",
      notes: "",
      receivedAt: this.toLocalDateTimeInput(new Date()),
    };
  }
  private toLocalDateTimeInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  get confirmedBookings(): BookingDto[] {
    const q = this.bookingSearch.trim().toLowerCase();
    return this.bookings
      .filter(
        (b) =>
          b.status === "Confirmed" &&
          new Date(b.appointmentAt).getTime() >= Date.now() &&
          (!q ||
            `${b.customerName} ${b.phone} ${b.email ?? ""} ${b.serviceName ?? ""}`
              .toLowerCase()
              .includes(q)),
      )
      .sort(
        (a, b) =>
          +new Date(a.appointmentAt) - +new Date(b.appointmentAt),
      );
  }
  get filteredBookings(): BookingDto[] {
    const q = this.bookingSearch.trim().toLowerCase();
    return this.bookings.filter(
      (b) =>
        (this.bookingStatusFilter === "All" ||
          b.status === this.bookingStatusFilter) &&
        (!q ||
          `${b.customerName} ${b.phone} ${b.email ?? ""} ${b.serviceName ?? ""}`
            .toLowerCase()
            .includes(q)),
    );
  }
  get paidAmount(): number {
    return this.bookingPayments.reduce((sum, p) => sum + p.amount, 0);
  }
  get bookingFinalAmount(): number {
    return Math.max(
      0,
      Number(this.bookingForm.priceSnapshot || 0) -
      Number(this.bookingForm.discountAmount || 0),
    );
  }
  get selectedBookingPaid(): number {
    return this.bookingPayments.reduce((sum, p) => sum + p.amount, 0);
  }
  get selectedBookingBalance(): number {
    return Math.max(
      0,
      (this.selectedBooking?.priceSnapshot ?? 0) -
      (this.selectedBooking?.discountAmount ?? 0) -
      this.selectedBookingPaid,
    );
  }
  get pendingBookings(): number {
    return this.bookings.filter((b) => b.status === "Pending").length;
  }
  get upcomingBookings(): BookingDto[] {
    return [...this.bookings]
      .filter(
        (b) =>
          new Date(b.appointmentAt).getTime() >= Date.now() &&
          !["Cancelled", "Rejected"].includes(b.status),
      )
      .sort(
        (a, b) =>
          +new Date(a.appointmentAt) - +new Date(b.appointmentAt),
      );
  }
  get publishedServices(): number {
    return this.services.filter((s) => s.isPublished && s.isActive).length;
  }
  get maxMonthlyBookings(): number {
    return Math.max(
      1,
      ...(this.report?.monthly.map((m) => m.bookings) ?? [0]),
    );
  }
  get monthlyBookings(): number {
    const d = new Date();
    return this.bookings.filter((b) => {
      const x = new Date(b.appointmentAt);
      return (
        x.getMonth() === d.getMonth() &&
        x.getFullYear() === d.getFullYear()
      );
    }).length;
  }
  login(): void {
    this.loginError = "";
    this.loginPending = true;
    this.api
      .login(this.email.trim(), this.password)
      .pipe(finalize(() => (this.loginPending = false)))
      .subscribe({
        next: (result) => {
          if (!result.user.roles.includes("StudioAdmin")) {
            this.loginError =
              "This account does not have studio administration access.";
            return;
          }
          this.auth.saveSession(result);
          void this.router
            .navigate(["/studio"], {
              queryParams: { signedIn: "1" },
              replaceUrl: true,
            })
            .then(() => {
              this.loadAll();
              this.cd.detectChanges();
            });
        },
        error: (err) =>
        (this.loginError =
          err?.status === 401
            ? "Email or password is incorrect."
            : err?.status === 0
              ? "Cannot reach the API. Confirm that the backend is running at http://localhost:5001."
              : err?.error?.message ||
              (err?.name === "TimeoutError"
                ? "The API did not respond within 20 seconds."
                : `Sign in failed (HTTP ${err?.status || "unknown"}).`)),
      });
  }
  logout(): void {
    this.auth.logout();
    this.services = [];
    this.bookings = [];
    this.posts = [];
    this.password = "";
  }
  loadAll(): void {
    this.error = "";
    this.loading = true;
    let completed = 0;
    const done = () => {
      if (++completed === 4) this.loading = false;
    };
    this.api.getAdminServices().subscribe({
      next: (rows) => {
        this.services = rows;
        this.cd.detectChanges();
        done();
      },
      error: (err) => {
        this.handleLoadError(err);
        done();
      },
    });
    this.api.getBookings().subscribe({
      next: (rows) => {
        this.bookings = rows;
        this.cd.detectChanges();
        done();
      },
      error: (err) => {
        this.handleLoadError(err);
        this.cd.detectChanges();
        done();
      },
    });
    this.api.getAdminPosts().subscribe({
      next: (rows) => {
        this.posts = rows;
        this.cd.detectChanges();
        done();
      },
      error: (err) => {
        this.handleLoadError(err);
        this.cd.detectChanges();
        done();
      },
    });
    this.api.getStudioReport().subscribe({
      next: (report) => {
        this.report = report;
        done();
      },
      error: (err) => {
        this.handleLoadError(err);
        done();
      },
    });

    this.cd.detectChanges();
  }
  private describeApiError(err: any, fallback: string): string {
    const detail =
      typeof err?.error === "string"
        ? err.error
        : err?.error?.message || err?.error?.title;
    if (err?.name === "TimeoutError")
      return `${fallback}: request timed out after 20 seconds.`;
    if (err?.status === 0)
      return `${fallback}: cannot reach the API at http://localhost:5001. Check that the backend is running.`;
    return `${fallback} (HTTP ${err?.status || "unknown"}${detail ? `: ${detail}` : ""}).`;
  }
  private handleLoadError(err: any): void {
    console.error("Studio workspace API request failed", err);
    if (err?.status === 401 || err?.status === 403) {
      this.loginError = `Your session expired or this user has no access (HTTP ${err.status}). Sign in again.`;
      this.error = "";
      this.auth.logout();
    } else
      this.error = this.describeApiError(
        err,
        "Some workspace data could not be loaded",
      );
  }
  emptyService(): ServiceRequestDto {
    return {
      name: "",
      category: "Bridal",
      description: "",
      price: 0,
      priceMode: "Fixed",
      durationMinutes: 60,
      coverImageUrl: null,
      isActive: true,
      isPublished: true,
    };
  }
  saveService(): void {
    if (!this.serviceForm.name.trim() || this.serviceForm.price < 0) return;
    this.saving = true;
    const req = { ...this.serviceForm, name: this.serviceForm.name.trim() };
    const call = this.editingServiceId
      ? this.api.updateAdminService(this.editingServiceId, req)
      : this.api.createAdminService(req);
    call.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.notice = this.editingServiceId
          ? "Service updated."
          : "Service created.";
        this.serviceForm = this.emptyService();
        this.editingServiceId = null;
        this.loadAll();
      },
      error: (err) =>
      (this.error = this.describeApiError(
        err,
        "Could not save the service",
      )),
    });
  }
  editService(s: PublicServiceDto): void {
    this.editingServiceId = s.id;
    this.serviceForm = {
      name: s.name,
      category: s.category,
      description: s.description,
      price: s.price,
      priceMode: s.priceMode,
      durationMinutes: s.durationMinutes ?? 60,
      coverImageUrl: s.coverImageUrl ?? null,
      isActive: s.isActive ?? true,
      isPublished: s.isPublished ?? false,
    };
    this.activeTab = "services";
  }
  toggleService(s: PublicServiceDto): void {
    const req: ServiceRequestDto = {
      name: s.name,
      category: s.category,
      description: s.description,
      price: s.price,
      priceMode: s.priceMode,
      durationMinutes: s.durationMinutes ?? null,
      coverImageUrl: s.coverImageUrl ?? null,
      isActive: s.isActive ?? true,
      isPublished: !(s.isPublished ?? false),
    };
    this.api.updateAdminService(s.id, req).subscribe({
      next: () => {
        this.notice = `${s.name} visibility updated.`;
        this.loadAll();
      },
      error: (err) =>
      (this.error = this.describeApiError(
        err,
        "Could not update service",
      )),
    });
  }
  deleteService(s: PublicServiceDto): void {
    if (!confirm(`Hide and deactivate “${s.name}”?`)) return;
    this.api.deleteAdminService(s.id).subscribe({
      next: () => {
        this.notice = "Service deactivated.";
        this.loadAll();
      },
      error: (err) =>
      (this.error = this.describeApiError(
        err,
        "Could not deactivate service",
      )),
    });
  }
  onServiceSelected(): void {
    const service = this.services.find(
      (s) => s.id === this.bookingForm.serviceId,
    );
    if (service) {
      this.bookingForm.priceSnapshot = service.price;
      this.bookingForm.discountAmount = 0;
    }
  }
  openWalkInForm(): void {
    this.resetBookingForm();
    this.showWalkInForm = true;
    this.error = "";
    this.cd.detectChanges();
  }
  resetBookingForm(): void {
    this.bookingForm = this.emptyBookingForm();
    this.editingBookingId = null;
    this.initialAdvanceAmount = 0;
    this.initialPaymentMode = "Cash";
    this.showWalkInForm = false;
  }
  saveBooking(): void {
    const f = this.bookingForm;
    if (
      !f.customerName.trim() ||
      !f.phone.trim() ||
      !f.appointmentAt ||
      Number(f.priceSnapshot) < 0 ||
      Number(f.discountAmount) < 0 ||
      Number(f.discountAmount) > Number(f.priceSnapshot) ||
      Number(this.initialAdvanceAmount) < 0 ||
      Number(this.initialAdvanceAmount) > this.bookingFinalAmount
    ) {
      this.error =
        "Enter client name, phone, appointment date/time and valid price, discount and advance amounts.";
      this.cd.detectChanges();
      return;
    }
    const request: StudioBookingRequest = {
      ...f,
      customerName: f.customerName.trim(),
      phone: f.phone.trim(),
      email: f.email?.trim() || null,
      customerAddress: f.customerAddress?.trim() || null,
      priceSnapshot: Number(f.priceSnapshot),
      discountAmount: Number(f.discountAmount),
      appointmentAt: new Date(f.appointmentAt).toISOString(),
      eventDate: f.eventDate ? new Date(f.eventDate).toISOString() : null,
      notes: f.notes?.trim() || null,
      assignedArtist: f.assignedArtist?.trim() || null,
      eventType: f.eventType?.trim() || null,
    };
    this.bookingSaving = true;
    this.error = "";
    const wasEditing = !!this.editingBookingId;
    const advance = Number(this.initialAdvanceAmount || 0);
    const paymentMode = this.initialPaymentMode;
    let advanceWarning = "";
    const call = wasEditing
      ? this.api.updateBookingDetails(this.editingBookingId!, request)
      : this.api.createWalkInBooking(request);
    call.pipe(
      switchMap((saved) => {
        if (wasEditing || advance <= 0)
          return of({ saved, advanceSaved: true });
        return this.api
          .addBookingPayment(saved.id, {
            amount: advance,
            paymentMode,
            reference: null,
            notes: "Initial advance received during walk-in booking",
            receivedAt: new Date().toISOString(),
          })
          .pipe(
            map(() => ({ saved, advanceSaved: true })),
            catchError((err) => {
              advanceWarning = this.describeApiError(
                err,
                "Advance payment could not be recorded",
              );
              return of({ saved, advanceSaved: false });
            }),
          );
      }),
      finalize(() => {
        this.bookingSaving = false;
        this.cd.detectChanges();
      }),
    ).subscribe({
      next: (result) => {
        this.notice = wasEditing
          ? "Booking details updated."
          : advance > 0 && !result.advanceSaved
            ? "Booking saved, but advance payment was not recorded. Open Details / payments to add it."
            : "Walk-in booking saved and confirmed.";
        if (advanceWarning) this.error = advanceWarning;
        this.resetBookingForm();
        this.loadAll();
        this.cd.detectChanges();
      },
      error: (err) => {
        this.error = this.describeApiError(
          err,
          "Could not save booking",
        );
        this.cd.detectChanges();
      },
    });
    this.cd.detectChanges();
  }
  editBooking(b: BookingDto): void {
    this.initialAdvanceAmount = 0;
    this.initialPaymentMode = "Cash";
    this.editingBookingId = b.id;
    this.bookingForm = {
      customerName: b.customerName,
      phone: b.phone,
      email: b.email ?? "",
      customerAddress: b.customerAddress ?? "",
      serviceId: b.serviceId,
      appointmentAt: this.toLocalDateTimeInput(new Date(b.appointmentAt)),
      priceSnapshot: b.priceSnapshot,
      discountAmount: b.discountAmount ?? 0,
      notes: b.notes ?? "",
      assignedArtist: b.assignedArtist ?? "",
      eventType: b.eventType ?? "",
      eventDate: b.eventDate
        ? new Date(b.eventDate).toISOString().slice(0, 10)
        : null,
    };
    this.activeTab = "bookings";
    this.showWalkInForm = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
    this.cd.detectChanges();
  }
  openBookingDetails(b: BookingDto): void {
    this.selectedBooking = b;
    this.bookingPayments = [];
    this.bookingHistory = [];
    this.cancellationReason = "";
    this.api.getBookingPayments(b.id).subscribe({
      next: (rows) => {
        this.bookingPayments = rows;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.error = this.describeApiError(
          err,
          "Could not load payments",
        );
        this.cd.detectChanges();
      },
    });
    this.api.getBookingHistory(b.id).subscribe({
      next: (rows) => {
        this.bookingHistory = rows;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.error = this.describeApiError(
          err,
          "Could not load booking history",
        );
        this.cd.detectChanges();
      },
    });
  }
  closeBookingDetails(): void {
    this.selectedBooking = null;
    this.bookingPayments = [];
    this.bookingHistory = [];
  }
  recordPayment(): void {
    if (
      !this.selectedBooking ||
      Number(this.paymentForm.amount) <= 0 ||
      Number(this.paymentForm.amount) > this.selectedBookingBalance
    ) {
      this.error =
        "Enter a payment greater than zero and no more than the remaining balance.";
      return;
    }
    this.paymentSaving = true;
    const request = {
      ...this.paymentForm,
      amount: Number(this.paymentForm.amount),
      receivedAt: this.paymentForm.receivedAt
        ? new Date(this.paymentForm.receivedAt).toISOString()
        : new Date().toISOString(),
      reference: this.paymentForm.reference?.trim() || null,
      notes: this.paymentForm.notes?.trim() || null,
    };
    this.api
      .addBookingPayment(this.selectedBooking.id, request)
      .pipe(
        finalize(() => {
          this.paymentSaving = false;
          this.cd.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.notice = "Payment recorded.";
          this.paymentForm = this.emptyPaymentForm();
          this.openBookingDetails(this.selectedBooking!);
          this.loadAll();
        },
        error: (err) => {
          this.error = this.describeApiError(
            err,
            "Could not record payment",
          );
          this.cd.detectChanges();
        },
      });
  }
  cancelBooking(b: BookingDto): void {
    const reason = prompt(`Cancellation reason for ${b.customerName}:`);
    if (reason === null) return;
    if (!reason.trim()) {
      this.error = "Please enter a cancellation reason.";
      return;
    }
    this.api
      .updateBookingStatus(b.id, "Cancelled", reason, reason)
      .subscribe({
        next: () => {
          this.notice = "Booking cancelled and reason saved.";
          this.loadAll();
          if (this.selectedBooking?.id === b.id)
            this.openBookingDetails(b);
        },
        error: (err) => {
          this.error = this.describeApiError(
            err,
            "Could not cancel booking",
          );
          this.cd.detectChanges();
        },
      });
  }
  changeBooking(b: BookingDto, status: string): void {
    if (status === "Cancelled") {
      this.cancelBooking(b);
      return;
    }
    this.api.updateBookingStatus(b.id, status).subscribe({
      next: () => {
        this.notice = `Booking marked ${status.toLowerCase()}.`;
        this.loadAll();
      },
      error: (err) =>
      (this.error = this.describeApiError(
        err,
        "Could not update booking status",
      )),
    });
  }
  savePost(): void {
    if (!this.postTitle.trim()) return;
    const req = {
      title: this.postTitle.trim(),
      body: this.postBody,
      coverImageUrl: this.postImage.trim() || null,
      status: this.postStatus,
    };
    const call = this.editingPostId
      ? this.api.updateAdminPost(this.editingPostId, req)
      : this.api.createAdminPost(req);
    call.subscribe({
      next: () => {
        this.postTitle = this.postBody = this.postImage = "";
        this.postStatus = "Draft";
        this.editingPostId = null;
        this.notice = "Content saved.";
        this.loadAll();
      },
      error: (err) =>
      (this.error = this.describeApiError(
        err,
        "Could not save content",
      )),
    });
  }
  editPost(p: PostDto): void {
    this.editingPostId = p.id;
    this.postTitle = p.title;
    this.postBody = p.body;
    this.postImage = p.coverImageUrl ?? "";
    this.postStatus = p.status;
    this.activeTab = "content";
  }
  togglePost(p: PostDto): void {
    const req = {
      title: p.title,
      body: p.body,
      coverImageUrl: p.coverImageUrl ?? null,
      status: p.status === "Published" ? "Draft" : "Published",
    };
    this.api.updateAdminPost(p.id, req).subscribe({
      next: () => {
        this.notice = "Post status updated.";
        this.loadAll();
      },
      error: (err) =>
      (this.error = this.describeApiError(
        err,
        "Could not update post status",
      )),
    });
  }
  deletePost(p: PostDto): void {
    if (!confirm(`Delete “${p.title}”?`)) return;
    this.api.deleteAdminPost(p.id).subscribe({
      next: () => {
        this.notice = "Post deleted.";
        this.loadAll();
      },
      error: (err) =>
      (this.error = this.describeApiError(
        err,
        "Could not delete post",
      )),
    });
  }
  goPublic(): void {
    void this.router.navigateByUrl("/");
  }
  goPlatform(): void {
    void this.router.navigateByUrl("/platform");
  }
  money(n: number): string {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  }
  dateTime(s: string): string {
    return new Date(s).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
}
