import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-ans-dialog',
    standalone: true,
    imports: [CommonModule, DialogModule, ButtonModule],
    templateUrl: './ans-dialog.html'
})
export class AnsDialogComponent {
    @Input() visible: boolean = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    close() {
        this.visible = false;
        this.visibleChange.emit(false);
    }
}
