import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReachStats } from '../../../../services/dashboard.service';

@Component({
    selector: 'app-reach-tab',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './reach-tab.component.html',
    styleUrls: ['./reach-tab.component.scss']
})
export class ReachTabComponent {
    @Input() data: ReachStats | null = null;
    @Output() drillDown = new EventEmitter<{ section?: string }>();

    onSectionClick(section: string) {
        this.drillDown.emit({ section });
    }
}
