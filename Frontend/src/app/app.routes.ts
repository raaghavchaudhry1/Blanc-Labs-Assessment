import { Routes } from '@angular/router';
import { NewsReleasesPageComponent } from './news-releases-page/news-releases-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'news-releases' },
  { path: 'news-releases', component: NewsReleasesPageComponent }
];
