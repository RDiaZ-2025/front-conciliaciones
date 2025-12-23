import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { ProductionRequest, UploadedFile, Team } from '../../production.models';
import { AzureStorageService } from '../../../../services/azure-storage.service';
import { TeamService } from '../../../../services/team.service';
import { User } from '../../../../services/user.service';

@Component({
  selector: 'app-production-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FloatLabelModule,
    TextareaModule,
    DatePickerModule,
    FileUploadModule,
    ToastModule,
    SelectModule
  ],
  providers: [MessageService],
  templateUrl: './production-dialog.html',
  styleUrl: './production-dialog.scss'
})
export class ProductionDialogComponent implements OnInit {
  fb = inject(FormBuilder);
  ref = inject(DynamicDialogRef);
  config = inject(DynamicDialogConfig);
  azureService = inject(AzureStorageService);
  messageService = inject(MessageService);
  teamService = inject(TeamService);
  cd = inject(ChangeDetectorRef);

  form!: FormGroup;
  isEditMode = false;
  uploadedFiles: any[] = [];
  existingFiles: UploadedFile[] = [];
  isUploading = false;
  minDate: Date = new Date();
  teams: Team[] = [];
  requestingUsers: User[] = [];
  assignedUsers: User[] = [];

  ngOnInit() {
    this.isEditMode = !!this.config.data?.id;
    const data = this.config.data || {};

    this.form = this.fb.group({
      name: [data.name || '', Validators.required],
      department: [data.department || '', Validators.required],
      contactPerson: [data.contactPerson || '', Validators.required],
      assignedTeam: [data.assignedTeam || '', Validators.required],
      assignedUserId: [data.assignedUserId || null, Validators.required],
      deliveryDate: [data.deliveryDate ? new Date(data.deliveryDate) : null, Validators.required],
      observations: [data.observations || '']
    });

    this.loadTeams();

    if (this.isEditMode && data.files) {
      this.existingFiles = data.files;
    }

    this.setupValueChanges();
  }

  setupValueChanges() {
    this.form.get('department')?.valueChanges.subscribe(deptName => {
      this.loadUsersForDepartment(deptName);
    });

    this.form.get('assignedTeam')?.valueChanges.subscribe(teamName => {
      this.loadUsersForAssignedTeam(teamName);
    });
  }

  loadTeams() {
    this.teamService.getTeams().subscribe({
      next: (response) => {
        if (response.success) {
          this.teams = response.data;
          
          // Initial load of users if data exists
          const dept = this.form.get('department')?.value;
          if (dept) this.loadUsersForDepartment(dept);

          const team = this.form.get('assignedTeam')?.value;
          if (team) this.loadUsersForAssignedTeam(team);
        }
      },
      error: (error) => {
        console.error('Error loading teams', error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los equipos' });
      }
    });
  }

  loadUsersForDepartment(deptName: string) {
    const team = this.teams.find(t => t.name === deptName);
    if (team) {
      this.teamService.getUsersByTeam(team.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.requestingUsers = response.data;
          }
        }
      });
    } else {
      this.requestingUsers = [];
    }
  }

  loadUsersForAssignedTeam(teamName: string) {
    const team = this.teams.find(t => t.name === teamName);
    if (team) {
      this.teamService.getUsersByTeam(team.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.assignedUsers = response.data;
            this.cd.detectChanges();
          }
        }
      });
    } else {
      this.assignedUsers = [];
      this.cd.detectChanges();
    }
  }

  async onUpload(event: any) {
    this.isUploading = true;
    const files = event.files;
    const requestId = this.config.data?.id || Date.now().toString(); // Use temp ID if new

    try {
      const folderPath = AzureStorageService.generateProductionFolderPath(requestId);
      const results = await this.azureService.uploadFiles(files, {
        folderPath,
        metadata: {
          requestId,
          uploadType: 'production'
        }
      });

      const newFiles: UploadedFile[] = results.map((result, index) => ({
        id: `${folderPath}/${result.fileName}`,
        name: result.fileName,
        size: files[index].size,
        type: files[index].type,
        url: result.url,
        uploadDate: new Date().toISOString()
      }));

      this.uploadedFiles = [...this.uploadedFiles, ...newFiles];
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Files uploaded successfully' });
    } catch (error) {
      console.error('Upload error', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'File upload failed' });
    } finally {
      this.isUploading = false;
    }
  }

  save() {
    if (this.form.valid) {
      const formValue = this.form.value;
      const result: Partial<ProductionRequest> = {
        ...this.config.data,
        ...formValue,
        deliveryDate: formValue.deliveryDate ? formValue.deliveryDate.toISOString() : undefined,
        files: [...this.existingFiles, ...this.uploadedFiles]
      };
      this.ref.close(result);
    } else {
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        if (control?.invalid) {
          control.markAsDirty();
        }
      });
    }
  }

  cancel() {
    this.ref.close();
  }

  removeFile(file: UploadedFile) {
    // Logic to remove file (visual only for now, or actual delete if needed)
    this.existingFiles = this.existingFiles.filter(f => f.id !== file.id);
    this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== file.id);
  }
}
