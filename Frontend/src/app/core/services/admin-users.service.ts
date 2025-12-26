import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
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
  private apiUrl = `${API_BASE_URL}/api/admin/users`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AdminUserDto[]> {
    return this.http.get<AdminUserDto[]>(this.apiUrl);
  }

  toggleActive(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle`, {});
  }

  changeRole(id: number, role: string): Observable<any> {
    const body: UpdateUserRoleRequest = { role };
    return this.http.patch(`${this.apiUrl}/${id}/role`, body);
  }
}
