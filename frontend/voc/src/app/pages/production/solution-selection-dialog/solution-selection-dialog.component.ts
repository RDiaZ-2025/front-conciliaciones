import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'app-solution-selection-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        SelectModule
    ],
    templateUrl: './solution-selection-dialog.component.html',
    styleUrls: ['./solution-selection-dialog.component.scss']
})
export class SolutionSelectionDialogComponent {
    private fb = inject(FormBuilder);
    public ref = inject(DynamicDialogRef);

    form: FormGroup;

    categories = [
        { label: 'MOBILE', value: 'MOBILE' },
        { label: 'PROGRAMÁTICA', value: 'PROGRAMMATIC' },
        { label: 'CONTENIDO RED+', value: 'CONTENT_RED_PLUS' }
    ];

    // Map Category -> Types (Subcategories)
    categoryTypes: { [key: string]: any[] } = {
        'MOBILE': [
            { label: 'SMS', value: 'SMS' },
            { label: 'RCS', value: 'RCS' },
            { label: 'SAT PUSH', value: 'SAT_PUSH' },
            { label: 'PUSH MULTIMEDIA', value: 'PUSH_MULTIMEDIA' },
            { label: 'PRECARGAS VIRTUALES', value: 'VIRTUAL_PRELOADS' },
            { label: 'LLAMADA PREGRABADA', value: 'PRE_RECORDED_CALL' },
            { label: 'WHATSAPP BUSINESS', value: 'WHATSAPP_BUSINESS' },
            { label: 'MARKETING POR EMAIL', value: 'EMAIL_MARKETING' },
            { label: 'DATA REWARDS', value: 'DATA_REWARDS' }
        ],
        'PROGRAMMATIC': [
            { label: 'DISPLAY', value: 'DISPLAY' },
            { label: 'RICH MEDIA', value: 'RICH_MEDIA' },
            { label: 'PMAX', value: 'PMAX' },
            { label: 'NATIVE', value: 'NATIVE' },
            { label: 'REDES SOCIALES', value: 'SOCIAL_MEDIA' },
            { label: 'YOUTUBE', value: 'YOUTUBE' },
            { label: 'DOOH', value: 'DOOH' },
            { label: 'CTV - OTT', value: 'CTV_OFF' }
        ],
        'CONTENT_RED_PLUS': [
            { label: 'CONTENIDO RED+', value: 'CONTENIDO_RED_PLUS' }
        ]
    };

    // Map Type -> Solutions
    typeSolutions: { [key: string]: any[] } = {
        // MOBILE (1-to-1 mapping)
        'SMS': [{ label: 'SMS', value: 'SMS' }],
        'RCS': [{ label: 'RCS', value: 'RCS' }],
        'SAT_PUSH': [{ label: 'SAT PUSH', value: 'SAT_PUSH' }],
        'PUSH_MULTIMEDIA': [{ label: 'PUSH MULTIMEDIA', value: 'PUSH_MULTIMEDIA' }],
        'VIRTUAL_PRELOADS': [{ label: 'PRECARGAS VIRTUALES', value: 'VIRTUAL_PRELOADS' }],
        'PRE_RECORDED_CALL': [{ label: 'LLAMADA PREGRABADA', value: 'PRE_RECORDED_CALL' }],
        'WHATSAPP_BUSINESS': [{ label: 'WHATSAPP BUSINESS', value: 'WHATSAPP_BUSINESS' }],
        'EMAIL_MARKETING': [{ label: 'MARKETING POR EMAIL', value: 'EMAIL_MARKETING' }],
        'DATA_REWARDS': [{ label: 'DATA REWARDS', value: 'DATA_REWARDS' }],

        // PROGRAMMATIC
        'DISPLAY': [
            { label: 'MOBILE', value: 'MOBILE_DISPLAY' },
            { label: 'DESKTOP', value: 'DESKTOP_DISPLAY' }
        ],
        'RICH_MEDIA': [
            { label: 'ADINTERACTIVE', value: 'ADINTERACTIVE' },
            { label: 'FULL REMINDER', value: 'FULL_REMINDER' },
            { label: 'SUN INSTANT', value: 'SUN_INSTANT' },
            { label: 'SKIN', value: 'SKIN' }
        ],
        'PMAX': [
            { label: 'PMAX', value: 'PMAX_AD' }
        ],
        'NATIVE': [
            { label: 'NATIVE ADS', value: 'NATIVE_ADS' }
        ],
        'SOCIAL_MEDIA': [
            { label: 'FACEBOOK E INSTAGRAM', value: 'FACEBOOK_INSTAGRAM' },
            { label: 'TIKTOK', value: 'TIKTOK' }
        ],
        'YOUTUBE': [
            { label: 'BUMPER ADS', value: 'BUMPER_ADS' },
            { label: 'SKIPPABLE IN-STREAM', value: 'SKIPPABLE_IN_STREAM' },
            { label: 'UNSKIPPABLE IN-STREAM', value: 'UNSKIPPABLE_IN_STREAM' }
        ],
        'DOOH': [
            { label: 'VALLAS EXTERIORES', value: 'OUTDOOR_BILLBOARDS' },
            { label: 'VALLAS INTERIORES', value: 'INDOOR_BILLBOARDS' }
        ],
        'CTV_OFF': [
            { label: 'CTV - OTT', value: 'CTV_VIDEO' }
        ],

        // CONTENT_RED_PLUS
        'CONTENIDO_RED_PLUS': [
            { label: 'Especificaciones para un content y publirreportaje', value: 'CONTENT_PUBLIRREPORTAJE' }
        ]
    };

    filteredTypes = signal<any[]>([]);
    filteredSolutions = signal<any[]>([]);

    constructor() {
        this.form = this.fb.group({
            category: [null, Validators.required],
            type: [{ value: null, disabled: true }, Validators.required],
            solution: [{ value: null, disabled: true }, Validators.required]
        });

        // Handle Category Change
        this.form.get('category')?.valueChanges.subscribe(category => {
            this.filteredTypes.set([]);
            this.filteredSolutions.set([]);
            this.form.get('type')?.reset();
            this.form.get('solution')?.reset();
            this.form.get('type')?.disable();
            this.form.get('solution')?.disable();

            if (category) {
                const types = this.categoryTypes[category] || [];
                this.filteredTypes.set(types);
                this.form.get('type')?.enable();
            }
        });

        // Handle Type Change
        this.form.get('type')?.valueChanges.subscribe(type => {
            this.filteredSolutions.set([]);
            this.form.get('solution')?.reset();
            this.form.get('solution')?.disable();

            if (type) {
                const solutions = this.typeSolutions[type] || [];
                this.filteredSolutions.set(solutions);
                this.form.get('solution')?.enable();

                // Auto-select if only one solution
                if (solutions.length === 1) {
                    this.form.get('solution')?.setValue(solutions[0].value);
                }
            }
        });
    }

    submit() {
        if (this.form.valid) {
            this.ref.close(this.form.value);
        }
    }

    cancel() {
        this.ref.close();
    }
}
