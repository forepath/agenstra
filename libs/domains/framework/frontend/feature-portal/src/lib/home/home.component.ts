import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'framework-portal-home',
  imports: [CommonModule, RouterModule],
  styleUrls: ['./home.component.scss'],
  templateUrl: './home.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalHomeComponent implements OnInit {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly platformId = inject(PLATFORM_ID);
  activeSlide = signal<number>(1);
  autoplayInterval = this.initializeAutoplayInterval();

  ngOnInit(): void {
    this.titleService.setTitle(
      $localize`:@@featurePortalHome-metaTitle:Agenstra Platform - Centralized Control For Distributed AI Agents`,
    );
    this.metaService.addTags([
      {
        name: 'description',
        content: $localize`:@@featurePortalHome-metaDescription:Agenstra is the centralized control plane for AI agents. Orchestrate, govern, and observe distributed agent infrastructure with one platform designed for engineering teams.`,
      },
      {
        name: 'keywords',
        content: $localize`:@@featurePortalHome-metaKeywords:Agenstra, AI agent orchestration platform, AI agent management, agent infrastructure, central control plane, enterprise AI agent governance, multi agent orchestration`,
      },
      { name: 'author', content: 'IPvX UG (haftungsbeschränkt)' },
      { name: 'robots', content: 'index, follow' },
      { name: 'canonical', content: 'https://agenstra.com' },
    ]);
  }

  scrollToIntent(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const slideWidth = rect.width / 4;
    let slideNum = Math.floor(clickX / slideWidth) + 1;
    slideNum = Math.max(1, Math.min(4, slideNum));
    this.activeSlide.set(slideNum);
  }

  pauseAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
    }
    this.autoplayInterval = null;
  }

  resumeAutoplay() {
    this.autoplayInterval = this.initializeAutoplayInterval();
  }

  private initializeAutoplayInterval() {
    if (isPlatformBrowser(this.platformId)) {
      return setInterval(() => {
        this.activeSlide.update((prev) => prev + 1);
        if (this.activeSlide() > 4) {
          this.activeSlide.set(1);
        }
      }, 3000);
    }

    return null;
  }
}
