import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import {
  AdminToolsService,
  AdminToolDto,
  CreateToolRequest,
  ToolFileDto,
  UpdateToolRequest,
} from '../../../core/services/admin-tools.service';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';

@Component({
  selector: 'app-dashboard-tools',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, ReactiveFormsModule, FormsModule],
  templateUrl: './dashboard-tools.html',
  styleUrl: './dashboard-tools.scss',
})
export class DashboardTools implements OnInit {
  tools: AdminToolDto[] = [];
  isLoading = false;
  error: string | null = null;

  showForm = false;
  isSaving = false;
  isEditMode = false;
  editingToolId: number | null = null;
  toolForm: FormGroup;

  files: ToolFileDto[] = [];
  newFile: ToolFileDto = { fileName: '', fileUrl: '', sizeBytes: 0, contentType: '' };

  constructor(private adminTools: AdminToolsService, private fb: FormBuilder) {
    this.toolForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      url: ['', [Validators.required, Validators.maxLength(500)]],
      category: ['', [Validators.required, Validators.maxLength(150)]],
      avatarUrl: ['', [Validators.maxLength(500)]],
      displayOrder: [0, [Validators.required, Validators.min(0)]],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadTools();
  }

  loadTools(): void {
    this.isLoading = true;
    this.error = null;

    this.adminTools.getAll().subscribe({
      next: (data) => {
        this.tools = data;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load tools.';
        this.isLoading = false;
      },
    });
  }

  openCreate(): void {
    this.isEditMode = false;
    this.editingToolId = null;
    this.files = [];
    this.newFile = { fileName: '', fileUrl: '', sizeBytes: 0, contentType: '' };
    this.toolForm.reset({
      name: '',
      description: '',
      url: '',
      category: '',
      avatarUrl: '',
      displayOrder: this.tools.length + 1,
      isActive: true,
    });
    this.showForm = true;
    this.error = null;
  }

  onEdit(tool: AdminToolDto): void {
    this.isEditMode = true;
    this.editingToolId = tool.id;
    this.files = [...(tool.files || [])];
    this.newFile = { fileName: '', fileUrl: '', sizeBytes: 0, contentType: '' };

    this.toolForm.setValue({
      name: tool.name,
      description: tool.description,
      url: tool.url,
      category: tool.category,
      avatarUrl: tool.avatarUrl ?? '',
      displayOrder: tool.displayOrder,
      isActive: tool.isActive,
    });

    this.showForm = true;
    this.error = null;
  }

  closeForm(): void {
    this.showForm = false;
    this.isSaving = false;
    this.isEditMode = false;
    this.editingToolId = null;
    this.toolForm.reset({
      name: '',
      description: '',
      url: '',
      category: '',
      avatarUrl: '',
      displayOrder: 0,
      isActive: true,
    });
    this.files = [];
  }

  addFile(): void {
    if (!this.newFile.fileName || !this.newFile.fileUrl) return;
    this.files.push({ ...this.newFile });
    this.newFile = { fileName: '', fileUrl: '', sizeBytes: 0, contentType: '' };
  }

  removeFile(index: number): void {
    this.files.splice(index, 1);
  }

  onSubmit(): void {
    if (this.toolForm.invalid || this.isSaving) return;

    this.isSaving = true;
    const value = this.toolForm.value;

    const payload: CreateToolRequest | UpdateToolRequest = {
      name: value.name,
      description: value.description,
      url: value.url,
      category: value.category,
      avatarUrl: value.avatarUrl,
      displayOrder: value.displayOrder,
      isActive: value.isActive,
      files: [...this.files],
    };

    if (this.isEditMode && this.editingToolId != null) {
      this.adminTools.update(this.editingToolId, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeForm();
          this.loadTools();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'Failed to update tool.';
        },
      });
    } else {
      this.adminTools.create(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeForm();
          this.loadTools();
        },
        error: () => {
          this.isSaving = false;
          this.error = 'Failed to create tool.';
        },
      });
    }
  }

  onToggle(tool: AdminToolDto): void {
    this.adminTools.toggleActive(tool.id).subscribe({
      next: (res) => {
        tool.isActive = res.isActive;
      },
      error: () => {
        this.error = 'Failed to change status.';
      },
    });
  }

  onDelete(tool: AdminToolDto): void {
    const confirmDelete = confirm(`Delete tool "${tool.name}" ?`);
    if (!confirmDelete) return;

    this.adminTools.delete(tool.id).subscribe({
      next: () => {
        this.tools = this.tools.filter((t) => t.id !== tool.id);
      },
      error: () => {
        this.error = 'Failed to delete tool.';
      },
    });
  }
}
