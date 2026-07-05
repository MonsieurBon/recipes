import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * The compact-viewport main navigation: a fixed bar at the bottom of the screen with one tab per
 * top-level section. Sections that are not built yet (Rezepte, Menüplan) join as they ship.
 */
@Component({
  selector: 'app-bottom-nav',
  imports: [MatIcon, RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNav {}
