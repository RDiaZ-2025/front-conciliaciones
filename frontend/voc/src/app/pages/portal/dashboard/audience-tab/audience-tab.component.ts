import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudienceStats } from '../../../../services/dashboard.service';

@Component({
    selector: 'app-audience-tab',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './audience-tab.component.html',
    styleUrls: ['./audience-tab.component.scss']
})
export class AudienceTabComponent {
    @Input() data: AudienceStats | null = null;
    @Output() drillDown = new EventEmitter<{ section?: string }>();

    onSectionClick(section: string) {
        this.drillDown.emit({ section });
    }
}
