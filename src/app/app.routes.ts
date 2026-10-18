import { Routes } from '@angular/router';
import { PublicSiteComponent } from './features/public-site/public-site.component';
import { StudioAdminComponent } from './features/studio-admin/studio-admin.component';
import { PlatformAdminComponent } from './features/platform-admin/platform-admin.component';
export const routes: Routes = [
  { path: '', component: PublicSiteComponent, title: 'JJ Makeup Studio & Academy' },
  { path: 'site/:slug', component: PublicSiteComponent, title: 'Studio Website' },
  { path: 'studio', component: StudioAdminComponent, title: 'Studio Workspace' },
  { path: 'platform', component: PlatformAdminComponent, title: 'Platform Administration' },
  { path: '**', redirectTo: '' }
];
