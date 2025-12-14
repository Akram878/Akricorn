import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import {
  AdminToolsService,
  AdminToolDto,
  CreateToolRequest,
  ToolFileDto,
  UpdateToolRequest,
} from '../../../core/services/admin-tools.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
@Component({
  selector: 'app-dashboard-tools',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, ReactiveFormsModule],
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
  editingTool: AdminToolDto | null = null;
  toolForm: FormGroup;

  toolFiles: ToolFileDto[] = [];
  pendingFiles: File[] = [];
  avatarFile: File | null = null;
  avatarPreview: string | null = null;

  constructor(private adminTools: AdminToolsService, private fb: FormBuilder) {
    this.toolForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      url: ['', [Validators.maxLength(500)]],
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
    this.editingTool = null;
    this.toolFiles = [];
    this.pendingFiles = [];
    this.avatarFile = null;
    this.avatarPreview = null;
    this.toolForm.reset({
      name: '',
      description: '',
      url: '',

      isActive: true,
    });
    this.showForm = true;
    this.error = null;
  }

  onEdit(tool: AdminToolDto): void {
    this.isEditMode = true;
    this.editingToolId = tool.id;
    this.editingTool = tool;
    this.toolFiles = [...(tool.files || [])];
    this.pendingFiles = [];
    this.avatarFile = null;
    this.avatarPreview = tool.avatarUrl ?? null;

    this.toolForm.setValue({
      name: tool.name,
      description: tool.description,
      url: tool.url,

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
    this.editingTool = null;
    this.toolForm.reset({
      name: '',
      description: '',
      url: '',

      isActive: true,
    });
    this.toolFiles = [];
    this.pendingFiles = [];
    this.avatarFile = null;
    this.avatarPreview = null;
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.avatarFile = input.files[0];
    this.avatarPreview = URL.createObjectURL(this.avatarFile);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.pendingFiles.push(...Array.from(input.files));
    input.value = '';
  }

  removePendingFile(index: number): void {
    this.pendingFiles.splice(index, 1);
  }

  removeExistingFile(fileId: number, index: number): void {
    this.adminTools.deleteFile(fileId).subscribe({
      next: () => {
        this.toolFiles.splice(index, 1);
      },
      error: () => {
        this.error = 'Failed to delete tool file.';
      },
    });
  }

  async onSubmit(): Promise<void> {
    if (this.toolForm.invalid || this.isSaving) return;

    this.isSaving = true;
    this.error = null;
    const value = this.toolForm.value;

    const payload: CreateToolRequest | UpdateToolRequest = {
      name: value.name,
      description: value.description,
      url: value.url,

      isActive: value.isActive,
      category: this.editingTool?.category ?? 'General',
      displayOrder: this.editingTool?.displayOrder ?? this.tools.length + 1,
    };

    try {
      let toolId = this.editingToolId;

      if (this.isEditMode && toolId != null) {
        await firstValueFrom(this.adminTools.update(toolId, payload));
      } else {
        const res = await firstValueFrom(this.adminTools.create(payload));
        toolId = res?.toolId ?? null;
      }

      if (toolId == null) throw new Error('Could not determine tool id after save.');

      if (this.avatarFile) {
        await firstValueFrom(this.adminTools.uploadAvatar(toolId, this.avatarFile));
      }

      for (const file of this.pendingFiles) {
        await firstValueFrom(this.adminTools.uploadFile(toolId, file));
      }

      this.isSaving = false;
      this.closeForm();
      this.loadTools();
    } catch (err) {
      this.isSaving = false;
      this.error = 'Failed to save tool.';
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
