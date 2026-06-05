import { Component, OnInit, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DASHBOARD_CONFIG } from './dashboard.constants';
import {
  DashboardService,
  DashboardFilters,
  OverviewStats,
  ContentStats,
  EntityStats,
  ReachStats,
  AudienceStats
} from './dashboard.service';
import { DashboardFiltersComponent, FilterVisibility } from './components/dashboard-filters/dashboard-filters.component';
import { OverviewTabComponent } from './components/overview-tab/overview-tab.component';
import { ContentTabComponent } from './components/content-tab/content-tab.component';
import { EntitiesTabComponent } from './components/entities-tab/entities-tab.component';
import { ReachTabComponent } from './components/reach-tab/reach-tab.component';
import { AudienceTabComponent } from './components/audience-tab/audience-tab.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header';
import { ButtonModule } from 'primeng/button';

type Tab = 'overview' | 'content' | 'entities' | 'reach' | 'audience';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DashboardFiltersComponent,
    OverviewTabComponent,
    ContentTabComponent,
    EntitiesTabComponent,
    ReachTabComponent,
    AudienceTabComponent,
    PageHeaderComponent,
    ButtonModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {

  activeTab: Tab = 'overview';

  // Data containers
  overviewData: OverviewStats | null = null;
  contentData: ContentStats | null = null;
  entitiesData: EntityStats | null = null;
  reachData: ReachStats | null = null;
  audienceData: AudienceStats | null = null;

  filtersOptions: DashboardFilters = { authors: [], topics: [], categories: [], sections: [], sources: [] };

  filters: any = {
    start_date: '',
    end_date: '',
    source: [],
    section: [],
    author: [],
    topic: [],
    category: []
  };

  visibleFilters: FilterVisibility = {
    date: true,
    source: true,
    section: false,
    author: false,
    topic: false,
    category: false
  };

  isLoading = true;
  hasError = false;

  private destroyRef = inject(DestroyRef);

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Set default dates
    if (!this.filters.start_date) {
      this.filters.start_date = DASHBOARD_CONFIG.defaultStartDate;
    }
    if (!this.filters.end_date) {
      this.filters.end_date = new Date().toISOString().split('T')[0];
    }

    // Set default source if needed, e.g. "Discover"
    // this.filters.source = 'Discover';

    this.updateVisibility();
    this.loadFilters();
    this.loadData();
  }

  setTab(tab: Tab) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.updateVisibility();
    this.loadData();
  }

  updateVisibility() {
    // Show Source, Section, and Topic across all tabs as requested
    const defaultVisible = {
      date: true,
      source: true,
      section: true,
      topic: true,
      author: false,
      category: false
    };

    switch (this.activeTab) {
      case 'overview':
        this.visibleFilters = {
          date: true,
          source: true,
          section: false,
          topic: false,
          author: false,
          category: false
        };
        break;
      case 'content':
        this.visibleFilters = {
          date: true,
          source: true,
          section: true,
          topic: false,
          author: true,
          category: false
        };
        break;
      case 'entities':
        this.visibleFilters = {
          date: true,
          source: true,
          section: true,
          topic: true,
          author: false,
          category: true
        };
        break;
      case 'reach':
      case 'audience':
        this.visibleFilters = {
          date: true,
          source: true,
          section: false,
          topic: false,
          author: false,
          category: false
        };
        break;
    }
  }

  loadFilters() {
    this.dashboardService.getFilters().subscribe({
      next: (data) => {
        this.filtersOptions = data;
      },
      error: (err) => console.error('Error loading filters:', err)
    });
  }

  loadData() {
    this.isLoading = true;
    this.hasError = false;
    this.cdr.detectChanges(); // Show loader immediately

    let obs;
    switch (this.activeTab) {
      case 'overview': obs = this.dashboardService.getOverview(this.filters); break;
      case 'content': obs = this.dashboardService.getContent(this.filters); break;
      case 'entities': obs = this.dashboardService.getEntities(this.filters); break;
      case 'reach': obs = this.dashboardService.getReach(this.filters); break;
      case 'audience': obs = this.dashboardService.getAudience(this.filters); break;
    }

    if (obs) {
      (obs as any)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data: any) => {
            // Assign data to correct property
            if (this.activeTab === 'overview') this.overviewData = data;
            if (this.activeTab === 'content') this.contentData = data;
            if (this.activeTab === 'entities') this.entitiesData = data;
            if (this.activeTab === 'reach') this.reachData = data;
            if (this.activeTab === 'audience') this.audienceData = data;

            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.error(`Error loading data for ${this.activeTab}:`, err);
            this.isLoading = false;
            this.hasError = true;
            this.cdr.detectChanges();
          }
        });
    }
  }

  onFilterChange(newFilters: any) {
    this.filters = newFilters; // Ensure inputs are synced
    this.loadData();
  }

  onDrillDown(event: { author?: string, section?: string, topic?: string, category?: string }) {
    if (event.author) this.filters.author = event.author;
    if (event.section) this.filters.section = event.section;
    if (event.topic) this.filters.topic = event.topic;
    if (event.category) this.filters.category = event.category;

    // Switch tab logic
    if (event.author || event.topic) {
      this.activeTab = 'content';
    } else if (event.category) {
      this.activeTab = 'entities';
    }

    this.updateVisibility();
    this.loadData();
  }

  onClearFilters() {
    this.filters = {
      start_date: '2024-01-01',
      end_date: new Date().toISOString().split('T')[0],
      source: [],
      section: [],
      author: [],
      topic: [],
      category: []
    };
    this.loadData();
  }
}