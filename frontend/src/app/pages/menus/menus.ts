import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TreeTableModule } from 'primeng/treetable';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService, TreeNode } from 'primeng/api';
import { MenusService } from './menus.service';
import { MenuItem } from './menus.models';

@Component({
  selector: 'app-menus',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TreeTableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    SelectModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './menus.html',
  styleUrl: './menus.scss'
})
export class MenusComponent implements OnInit {
  private menuService = inject(MenusService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);

  menuItems = signal<TreeNode[]>([]);
  rawMenuItems = signal<MenuItem[]>([]);
  loading = signal<boolean>(false);
  dialogVisible = signal<boolean>(false);
  saving = signal<boolean>(false);
  editingItem = signal<MenuItem | null>(null);

  form: FormGroup;
  parentOptions = signal<{ label: string, value: number | null }[]>([]);

  constructor() {
    this.form = this.fb.group({
      label: ['', Validators.required],
      icon: [''],
      route: [''],
      parentId: [null],
      displayOrder: [0, Validators.required],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadMenuItems();
  }

  loadMenuItems() {
    this.loading.set(true);
    this.menuService.getMenuItems().subscribe({
      next: (response) => {
        this.rawMenuItems.set(response.data);
        this.menuItems.set(this.buildTree(response.data));
        this.updateParentOptions(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar menú' });
        this.loading.set(false);
      }
    });
  }

  buildTree(items: MenuItem[]): TreeNode[] {
    return items.map(item => ({
      data: item,
      children: item.children ? this.buildTree(item.children) : [],
      expanded: true
    }));
  }

  updateParentOptions(items: MenuItem[]) {
    const options: { label: string, value: number | null }[] = [
      { label: 'Ninguno (Raíz)', value: null }
    ];
    
    const flatten = (list: MenuItem[], prefix = '') => {
      list.forEach(item => {
        options.push({ label: prefix + item.label, value: item.id });
        if (item.children) {
          flatten(item.children, prefix + '-- ');
        }
      });
    };

    flatten(items);
    this.parentOptions.set(options);
  }

  openNew() {
    this.editingItem.set(null);
    this.form.reset({
      label: '',
      icon: '',
      route: '',
      parentId: null,
      displayOrder: 0,
      isActive: true
    });
    this.dialogVisible.set(true);
  }

  editItem(item: MenuItem) {
    this.editingItem.set(item);
    this.form.patchValue({
      label: item.label,
      icon: item.icon,
      route: item.route,
      parentId: item.parentId,
      displayOrder: item.displayOrder,
      isActive: item.isActive
    });
    this.dialogVisible.set(true);
  }

  deleteItem(item: MenuItem) {
    if (!confirm('¿Está seguro de eliminar este ítem de menú?')) return;

    this.loading.set(true);
    this.menuService.deleteMenuItem(item.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Ítem eliminado' });
        this.loadMenuItems();
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al eliminar ítem' });
        this.loading.set(false);
      }
    });
  }

  save() {
    if (this.form.invalid) return;

    this.saving.set(true);
    const data = this.form.value;
    const request = this.editingItem()
      ? this.menuService.updateMenuItem(this.editingItem()!.id, data)
      : this.menuService.createMenuItem(data);

    request.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Guardado correctamente' });
        this.dialogVisible.set(false);
        this.loadMenuItems();
        this.saving.set(false);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al guardar' });
        this.saving.set(false);
      }
    });
  }
}
