import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ApiService, PostDto, PublicServiceDto } from "../../api.service";
import { finalize } from "rxjs";
import { environment } from "src/environments/environment";

type PublicService = PublicServiceDto & { image: string; duration: string };
@Component({
  selector: "app-public-site",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./public-site.component.html",
})
export class PublicSiteComponent implements OnInit {
  slug = environment.tenantSlug;
  readonly minDate = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 10);
  mobileMenu = false;
  bookingOpen = false;
  bookingSubmitting = false;
  toast = "";
  activeNav = "Home";
  serviceSearch = "";
  bookingName = "";
  bookingPhone = "";
  bookingEmail = "";
  bookingServiceId = "";
  bookingDate = "";
  bookingTime = "10:00";
  bookingNotes = "";
  bookingError = "";
  services: PublicService[] = [];
  publishedPosts: PostDto[] = [];
  siteName = "JJ Makeup Studio & Academy";
  loadingServices = true;
  siteError = "";
  constructor(
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private  cd : ChangeDetectorRef
  ) { }
  ngOnInit(): void {
    // Route components are reused when navigating between /site/:slug URLs.
    // Subscribe to the parameter stream so the new tenant is actually reloaded.
    this.route.paramMap.subscribe((params) => {
      this.slug = params.get("slug") || environment.tenantSlug;
      this.loadStudio();
    });
  }
  private loadStudio(): void {
    this.loadingServices = true;
    this.siteError = "";
    this.services = [];
    this.publishedPosts = [];
    this.api.getSite(this.slug).subscribe({
      next: (site) => {
        this.siteName = site.name;
        document.documentElement.style.setProperty(
          "--studio-primary",
          site.primaryColor || "#5c2338",
        );
        document.documentElement.style.setProperty(
          "--wine",
          site.primaryColor || "#5c2338",
        );
        this.cd.detectChanges();
      },
      error: () => {
        this.siteError =
          "The studio website could not connect to the API. Start the backend and refresh.";
          this.cd.detectChanges();
      },
    });
    this.api.getPublicServices(this.slug).subscribe({
      next: (rows) => {
        this.services = rows.map((s) => ({
          ...s,
          image: s.coverImageUrl || this.defaultImage(s.category),
          duration: this.durationLabel(s.durationMinutes),
        }));
        this.loadingServices = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.loadingServices = false;
        this.siteError =
          err?.status === 404
            ? "This studio website is not active."
            : "Could not load services. Please check that the API is running.";
            this.cd.detectChanges();
      },
    });
    this.api
      .getPublicPosts(this.slug)
      .subscribe({
        next: (posts) => (this.publishedPosts = posts),
        error: () => (this.publishedPosts = []),
      });
      this.cd.detectChanges();
  }
  get filteredServices(): PublicService[] {
    const q = this.serviceSearch.toLowerCase().trim();
    return this.services.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }
  formatPrice(price: number): string {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  }
  durationLabel(minutes?: number | null): string {
    if (!minutes) return "By consultation";
    if (minutes < 60) return `${minutes} minutes`;
    return `${Math.floor(minutes / 60)}${minutes % 60 ? `h ${minutes % 60}m` : " hours"}`;
  }
  private defaultImage(category: string): string {
    return category.toLowerCase().includes("academy")
      ? "https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=900&q=85"
      : category.toLowerCase().includes("bridal")
        ? "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=85"
        : "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=85";
  }
  goTo(id: string, label: string): void {
    this.activeNav = label;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    this.mobileMenu = false;
  }
  notify(message: string): void {
    this.toast = message;
    window.setTimeout(() => (this.toast = ""), 3500);
  }
  requestStudio(): void {
    void this.router.navigateByUrl("/studio");
  }
  requestPlatform(): void {
    void this.router.navigateByUrl("/platform");
  }
  openBooking(serviceName?: string): void {
    if (serviceName)
      this.bookingServiceId =
        this.services.find((s) => s.name === serviceName)?.id ?? "";
    this.bookingError = "";
    this.bookingOpen = true;
  }
  openBookingFor(id: string): void {
    this.bookingServiceId = id;
    this.openBooking();
  }
  submitBooking(): void {
    if (
      !this.bookingName.trim() ||
      !this.bookingPhone.trim() ||
      !this.bookingDate ||
      !this.bookingTime ||
      !this.bookingServiceId
    ) {
      this.bookingError = "Please complete the required fields.";
      return;
    }
    const appointment = new Date(`${this.bookingDate}T${this.bookingTime}`);
    if (
      Number.isNaN(appointment.getTime()) ||
      appointment.getTime() <= Date.now()
    ) {
      this.bookingError = "Choose a future date and time.";
      return;
    }
    this.bookingSubmitting = true;
    this.bookingError = "";
    this.api
      .createBooking(this.slug, {
        customerName: this.bookingName.trim(),
        phone: this.bookingPhone.trim(),
        email: this.bookingEmail.trim() || undefined,
        serviceId: this.bookingServiceId,
        appointmentAt: appointment.toISOString(),
        notes: this.bookingNotes.trim() || undefined,
      })
      .pipe(finalize(() => (this.bookingSubmitting = false)))
      .subscribe({
        next: (result) => {
          this.bookingOpen = false;
          this.notify(
            `Booking request submitted. Reference: ${result.id.slice(0, 8).toUpperCase()}`,
          );
          this.bookingName =
            this.bookingPhone =
            this.bookingEmail =
            this.bookingDate =
            this.bookingNotes =
            "";
          this.bookingTime = "10:00";
        },
        error: (err) => {
          this.bookingError =
            err?.error?.message ||
            (err?.status === 409
              ? "That time is already requested. Please select another time."
              : err?.name === "TimeoutError"
                ? "The API did not respond within 20 seconds. Check that the backend is running, then try again."
                : "Booking could not be saved. Check the API and try again.");
        },
      });
  }
}
