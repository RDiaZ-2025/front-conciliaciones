import { Component, inject, OnInit } from '@angular/core';
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

@Component({
    selector: 'app-material-register-list-dialog',
    standalone: true,
    imports: [CommonModule, TableModule, ButtonModule, TooltipModule],
    providers: [DialogService],
    template: `
    <div class="flex flex-column gap-3 p-3">
        <div class="flex justify-content-between align-items-center">
            <h3 class="m-0 text-700">Registros de Material</h3>
            <p-button label="Agregar Nuevo" icon="pi pi-plus" (click)="addMaterialRegister()"></p-button>
        </div>

        <p-table [value]="registers" [rows]="5" [paginator]="true" [rowHover]="true" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
                <tr>
                    <th>Categoría</th>
                    <th>Tipo</th>
                    <th>Solución</th>
                    <th>Fecha Creación</th>
                    <!-- <th>Acciones</th> -->
                </tr>
            </ng-template>
            <ng-template pTemplate="body" let-register>
                <tr>
                    <td>{{ register.category }}</td>
                    <td>{{ register.type }}</td>
                    <td>{{ register.solution }}</td>
                    <td>{{ register.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                    <!-- <td>
                        <p-button icon="pi pi-eye" [text]="true" [rounded]="true" severity="info" pTooltip="Ver Detalle"></p-button>
                    </td> -->
                </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
                <tr>
                    <td colspan="4" class="text-center p-4">No hay registros de material.</td>
                </tr>
            </ng-template>
        </p-table>

        <div class="flex justify-content-end mt-3 border-top-1 surface-border pt-3">
            <p-button label="Cerrar" icon="pi pi-times" [text]="true" (click)="close()"></p-button>
        </div>
    </div>
  `
})
export class MaterialRegisterListDialogComponent implements OnInit {
    config = inject(DynamicDialogConfig);
    ref = inject(DynamicDialogRef);
    productionService = inject(ProductionService);
    dialogService = inject(DialogService);
    messageService = inject(MessageService);

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

        // Special case for complex material preparation dialog (if needed)
        // Actually, ProductionComponent logic splits this. 
        // Wait, ProductionComponent calls openSolutionDialog for specific components, 
        // and openMaterialPreparationDialog for... when?
        // Ah, lines 496 in production.ts defines openMaterialPreparationDialog but it seems unused in openImplementation?
        // Let's re-read production.ts. openImplementation calls openSolutionDialog (line 410).
        // openSolutionDialog handles all cases.
        // So openMaterialPreparationDialog might be legacy or for a different flow?
        // Wait, MaterialPreparationDialogComponent IS used in openMaterialPreparationDialog.
        // But openImplementation calls openSolutionDialog.
        // Ah, I see. SolutionSelectionDialog returns selection.
        // If I check openImplementation (line 398), it calls openSolutionDialog.
        // openSolutionDialog (line 416) uses specific components.
        // Where is MaterialPreparationDialogComponent used?
        // It is imported at line 32.
        // It is used in openMaterialPreparationDialog (line 496).
        // Is openMaterialPreparationDialog called anywhere?
        // I don't see it called in the visible snippet of production.ts.
        // Maybe it's not used? Or maybe I missed it.
        // However, the user asked to use MaterialPreparationDialogComponent logic?
        // Wait, the user said "when I save the data, it must be stored in a list...".
        // And "in that modal a button to add new MaterialRequests".
        // The previous context showed me editing MaterialPreparationDialogComponent.
        // Is MaterialPreparationDialogComponent a wrapper for all solutions?
        // Let's check MaterialPreparationDialogComponent.

        // Actually, let's just stick to what openSolutionDialog does, which seems to be the active code.
        // It opens specific dialogs (SmsDialog, RcsDialog, etc.).
        // These dialogs return data.
        // Then it saves using productionService.addMaterialRegister.

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
}
