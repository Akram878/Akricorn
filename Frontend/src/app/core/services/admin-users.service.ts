import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';

export interface AdminUserDto {
  id: number;
  name: string;
  family: string;
  email: string;
  countryCode: string;
  number: string;
  city: string;
  role: string;
  isActive: boolean;
  canEditBirthDate: boolean;
}

export interface UpdateUserRoleRequest {
  role: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminUsersService {
  private apiUrl = 'https://localhost:7150/api/admin/users';

  constructor(private http: HttpClient, private adminAuth: AdminAuthService) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.adminAuth.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });
  }

  getAll(): Observable<AdminUserDto[]> {
    return this.http.get<AdminUserDto[]>(this.apiUrl, {
      headers: this.getAuthHeaders(),
    });
  }

  toggleActive(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle`, {}, { headers: this.getAuthHeaders() });
  }

  changeRole(id: number, role: string): Observable<any> {
    const body: UpdateUserRoleRequest = { role };
    return this.http.patch(`${this.apiUrl}/${id}/role`, body, { headers: this.getAuthHeaders() });
  }
}
