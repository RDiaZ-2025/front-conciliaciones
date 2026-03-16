import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicDialogConfig, DynamicDialogRef, DialogService } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { MaterialRegister, ProductionRequest } from '../../production.models';
import { ProductionService } from '../../../../services/production.service';

// Dialog Components
import { SolutionSelectionDialogComponent } from '../solution-selection-dialog/solution-selection-dialog.component';
import { MaterialPreparationDialogComponent } from '../material-preparation-dialog/material-preparation-dialog.component';
import { SmsDialogComponent } from '../solution-selection-dialog/components/sms-dialog/sms-dialog.component';
import { RcsDialogComponent } from '../solution-selection-dialog/components/rcs-dialog/rcs-dialog.component';
import { SatPushDialogComponent } from '../solution-selection-dialog/components/sat-push-dialog/sat-push-dialog.component';
import { PushMultimediaDialogComponent } from '../solution-selection-dialog/components/push-multimedia-dialog/push-multimedia-dialog.component';
import { VirtualPreloadsDialogComponent } from '../solution-selection-dialog/components/virtual-preloads-dialog/virtual-preloads-dialog.component';
import { PreRecordedCallDialogComponent } from '../solution-selection-dialog/components/pre-recorded-call-dialog/pre-recorded-call-dialog.component';
import { WhatsappBusinessDialogComponent } from '../solution-selection-dialog/components/whatsapp-business-dialog/whatsapp-business-dialog.component';
import { EmailMarketingDialogComponent } from '../solution-selection-dialog/components/email-marketing-dialog/email-marketing-dialog.component';
import { DataRewardsDialogComponent } from '../solution-selection-dialog/components/data-rewards-dialog/data-rewards-dialog.component';
import { GenericUploadDialogComponent } from '../solution-selection-dialog/components/generic-upload-dialog/generic-upload-dialog.component';
import { PmaxDialogComponent } from '../solution-selection-dialog/components/pmax-dialog/pmax-dialog.component';
import { NativeAdsDialogComponent } from '../solution-selection-dialog/components/native-ads-dialog/native-ads-dialog.component';
import { MetaAdsDialogComponent } from '../solution-selection-dialog/components/meta-ads-dialog/meta-ads-dialog.component';
import { TiktokDialogComponent } from '../solution-selection-dialog/components/tiktok-dialog/tiktok-dialog.component';
import { YoutubeDialogComponent } from '../solution-selection-dialog/components/youtube-dialog/youtube-dialog.component';
import { ContentRedplusDialogComponent } from '../solution-selection-dialog/components/content-redplus-dialog/content-redplus-dialog.component';
import { GenericViewDialogComponent } from './generic-view-dialog/generic-view-dialog.component';

@Component({
    selector: 'app-material-register-list-dialog',
    standalone: true,
    imports: [CommonModule, TableModule, ButtonModule, TooltipModule],
    providers: [DialogService],
    templateUrl: './material-register-list-dialog.component.html',
    styleUrls: ['./material-register-list-dialog.component.css']
})
export class MaterialRegisterListDialogComponent implements OnInit {
    config = inject(DynamicDialogConfig);
    ref = inject(DynamicDialogRef);
    productionService = inject(ProductionService);
    dialogService = inject(DialogService);
    messageService = inject(MessageService);
    cdr = inject(ChangeDetectorRef);

    request!: ProductionRequest;
    registers: MaterialRegister[] = [];

    // Keep track of secondary dialog ref
    dialogRef: DynamicDialogRef | undefined | null;

    ngOnInit() {
        this.request = this.config.data.request;
        this.loadRegisters();
    }

    loadRegisters() {
        this.productionService.getProductionRequestById(this.request.id).subscribe((updatedRequest: ProductionRequest) => {
            this.request = updatedRequest;
            this.registers = updatedRequest.materialRegisters || [];
            this.cdr.detectChanges();
        });
    }

    addMaterialRegister() {
        this.dialogRef = this.dialogService.open(SolutionSelectionDialogComponent, {
            header: 'Seleccione Solución',
            width: '400px',
            contentStyle: { "overflow": "auto" },
            baseZIndex: 10000,
            data: { request: this.request }
        });

        if (this.dialogRef) {
            this.dialogRef.onClose.subscribe((selection: any) => {
                if (selection) {
                    this.openSolutionDialog(this.request, selection);
                }
            });
        }
    }

    openSolutionDialog(request: ProductionRequest, selection: any) {
        let component: any;
        let header = 'Configuración de Solución';
        const solution = selection.solution;

        switch (solution) {
            // Mobile
            case 'SMS': component = SmsDialogComponent; header = 'SMS'; break;
            case 'RCS': component = RcsDialogComponent; header = 'RCS'; break;
            case 'SAT_PUSH': component = SatPushDialogComponent; header = 'SAT Push'; break;
            case 'PUSH_MULTIMEDIA': component = PushMultimediaDialogComponent; header = 'Push Multimedia'; break;
            case 'VIRTUAL_PRELOADS': component = VirtualPreloadsDialogComponent; header = 'Precargas Virtuales'; break;
            case 'PRE_RECORDED_CALL': component = PreRecordedCallDialogComponent; header = 'Llamada Pregrabada'; break;
            case 'WHATSAPP_BUSINESS': component = WhatsappBusinessDialogComponent; header = 'WhatsApp Business'; break;
            case 'EMAIL_MARKETING': component = EmailMarketingDialogComponent; header = 'Email Marketing'; break;
            case 'DATA_REWARDS': component = DataRewardsDialogComponent; header = 'Data Rewards'; break;

            // Programmatic
            case 'PMAX_AD': component = PmaxDialogComponent; header = 'PMAX'; break;
            case 'NATIVE_ADS': component = NativeAdsDialogComponent; header = 'Native Ads'; break;
            case 'FACEBOOK_INSTAGRAM': component = MetaAdsDialogComponent; header = 'Facebook & Instagram'; break;
            case 'TIKTOK': component = TiktokDialogComponent; header = 'TikTok'; break;
            case 'BUMPER_ADS':
            case 'SKIPPABLE_IN_STREAM':
            case 'UNSKIPPABLE_IN_STREAM':
                component = YoutubeDialogComponent; header = 'YouTube'; break;

            // Content Red+
            case 'CONTENT_PUBLIRREPORTAJE': component = ContentRedplusDialogComponent; header = 'Contenido Red+'; break;

            // Generic / Others
            default:
                component = GenericUploadDialogComponent;
                header = `Carga de Material: ${solution}`;
                break;
        }

        this.dialogRef = this.dialogService.open(component, {
            header: header,
            width: '600px',
            contentStyle: { "overflow": "auto" },
            baseZIndex: 10000,
            data: { request, selection, solutionType: solution }
        });

        if (this.dialogRef) {
            this.dialogRef.onClose.subscribe((result: any) => {
                if (result) {
                    const finalData = { ...result, ...selection };

                    const registerData = {
                        category: selection.category,
                        type: selection.type,
                        solution: selection.solution,
                        jsonRequest: result
                    };

                    this.productionService.addMaterialRegister(request.id, registerData).subscribe({
                        next: () => {
                            this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Registro agregado' });
                            this.loadRegisters(); // Refresh the list
                        },
                        error: (err) => {
                            console.error('Error adding material register:', err);
                            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al guardar la información' });
                        }
                    });
                }
            });
        }
    }

    close() {
        this.ref.close();
    }

    viewRegister(register: MaterialRegister) {
        let content = '';
        try {
            const data = typeof register.jsonRequest === 'string'
                ? JSON.parse(register.jsonRequest)
                : register.jsonRequest;

            content = '<div class="flex flex-column gap-2">';
            for (const [key, value] of Object.entries(data)) {
                content += `
                    <div class="flex flex-column">
                        <span class="font-bold text-700">${key}:</span>
                        <span class="text-900" style="word-break: break-word;">${value}</span>
                    </div>
                `;
            }
            content += '</div>';
        } catch (e) {
            content = '<p class="text-red-500">Error parsing data</p>';
        }

        this.dialogService.open(GenericViewDialogComponent, {
            header: `Detalle: ${register.solution}`,
            width: '500px',
            contentStyle: { "overflow": "auto" },
            baseZIndex: 10000,
            data: { content }
        });
    }
}
