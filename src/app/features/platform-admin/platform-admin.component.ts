import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { finalize } from "rxjs";
import { ApiService, PlatformReportDto, TenantDto } from "../../api.service";
import { AuthService } from "../../core/auth/auth.service";

@Component({
  selector: "app-platform-admin",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./platform-admin.component.html",
})
export class PlatformAdminComponent implements OnInit {
  email = "superadmin@makeupstudio.local";
  password = "DevOnly!ChangeMe2026";
  adminEmail = "";
  adminPassword = "";
  loginError = "";
  error = "";
  notice = "";
  loading = false;
  loginPending = false;
  saving = false;
  reportLoading = false;
  busyTenantId: string | null = null;
  activeTab: "overview" | "workspaces" | "reports" = "overview";
  tenants: TenantDto[] = [];
  report: PlatformReportDto | null = null;
  name = "";
  slug = "";
  plan = "Starter";
  createdAdminEmail = "";
  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private cd: ChangeDetectorRef
  ) { }
  ngOnInit(): void {
    if (this.auth.isAuthenticated() && this.auth.hasRole("SuperAdmin")) {
      this.loadTenants();
      this.loadReport();
    }
  }
  get activeCount(): number {
    return this.tenants.filter((t) => t.status === "Active").length;
  }
  get uniquePlans(): number {
    return new Set(this.tenants.map((t) => t.plan)).size;
  }
  get maxMonthlyBookings(): number {
    return Math.max(
      1,
      ...(this.report?.monthly.map((m) => m.bookings) ?? [0]),
    );
  }
  login(): void {
    this.loginError = "";
    this.loginPending = true;
    this.api
      .login(this.email.trim(), this.password)
      .pipe(finalize(() => (this.loginPending = false)))
      .subscribe({
        next: (r) => {
          if (!r.user.roles.includes("SuperAdmin")) {
            this.loginError = "This account is not a Super Admin.";
            this.cd.detectChanges();
            return;
          }
          this.auth.saveSession(r);
          void this.router.navigate(["/platform"], {
            queryParams: { signedIn: "1" },
            replaceUrl: true,
          });
          this.loadTenants();
          this.loadReport();
          this.cd.detectChanges();
        },
        error: (err) =>
        (this.loginError = this.describeError(
          err,
          "Sign in failed",
        )),
      });
    this.cd.detectChanges();
  }
  logout(): void {
    this.auth.logout();
    this.tenants = [];
    this.password = "";
  }
  loadTenants(): void {
    this.loading = true;
    this.error = "";
    this.cd.detectChanges();

    this.api
      .getTenants()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cd.detectChanges();
        })
      )
      .subscribe({
        next: (rows) => {
          this.tenants = rows;
          this.cd.detectChanges();
        },
        error: (err) => {
          console.error("GET /api/superadmin/tenants failed", err);

          this.error = this.describeError(
            err,
            "Could not load studios"
          );

          if (err?.status === 401 || err?.status === 403) {
            this.loginError =
              "Your Super Admin session is invalid or expired. Please sign in again.";
            this.auth.logout();
          }

          this.cd.detectChanges();
        },
      });
  }
  loadReport(): void {
    this.reportLoading = true;
    this.api
      .getPlatformReport()
      .pipe(finalize(() => (this.reportLoading = false)))
      .subscribe({
        next: (r) => (this.report = r),
        error: (err) => {
          console.error(
            "GET /api/superadmin/reports/summary failed",
            err,
          );
          this.error = this.describeError(
            err,
            "Could not load platform reporting",
          );
          if (err?.status === 401 || err?.status === 403) {
            this.loginError =
              "Your Super Admin session is invalid or expired. Please sign in again.";
            this.auth.logout();
          }
        },
      });
  }
  private describeError(err: any, fallback: string): string {
    if (err?.status === 401) return "Email or password is incorrect.";
    const detail =
      typeof err?.error === "string"
        ? err.error
        : err?.error?.message || err?.error?.title;
    if (err?.name === "TimeoutError")
      return `${fallback}: API timed out after 20 seconds.`;
    if (err?.status === 0)
      return `${fallback}: cannot reach ${err?.url || "the API"}. Check that the backend is running at http://localhost:5001.`;
    return `${fallback} (HTTP ${err?.status || "unknown"}${detail ? `: ${detail}` : ""}).`;
  }
  createTenant(): void {
    const name = this.name.trim(),
      slug = this.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    if (!name || !slug || !this.adminEmail.trim() || !this.adminPassword) {
      this.error =
        "Enter studio name, URL slug, admin email and a strong admin password.";
      return;
    }
    this.saving = true;
    this.error = "";
    this.api
      .createTenant({
        name,
        slug,
        plan: this.plan,
        adminEmail: this.adminEmail.trim(),
        adminPassword: this.adminPassword,
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cd.detectChanges();
        })
      ).subscribe({
        next: () => {
          this.createdAdminEmail = this.adminEmail.trim();
          this.notice = `Studio workspace created. Studio Admin login: ${this.createdAdminEmail}.`;

          this.name = "";
          this.slug = "";
          this.adminEmail = "";
          this.adminPassword = "";
          this.plan = "Starter";

          this.cd.detectChanges();
          this.loadTenants();
          this.loadReport();
        },
        error: (err) => {
          this.error = this.describeError(
            err,
            "Could not create studio workspace"
          );
          this.cd.detectChanges();
        }
      });
  }
  goPublic(): void {
    void this.router.navigateByUrl("/");
  }
  goStudio(): void {
    void this.router.navigateByUrl("/studio");
  }
  changeStatus(t: TenantDto): void {
    const status = t.status === "Active" ? "Suspended" : "Active";
    this.busyTenantId = t.id;
    this.error = "";
    this.api
      .updateTenantStatus(t.id, status)
      .pipe(
        finalize(() => {
          this.busyTenantId = null;
          this.cd.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.notice = `${t.name} is now ${status.toLowerCase()}.`;
          this.cd.detectChanges();
          this.loadTenants();
          this.loadReport();
        },
        error: (err) => {
          this.error = this.describeError(
            err,
            "Could not change workspace status"
          );
          this.cd.detectChanges();
        },
      });
  }
}
