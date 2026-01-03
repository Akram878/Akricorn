import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // Currently using alert; later we might replace it with a nicer toast
  showError(message: string): void {
    alert(message);
  }

  showSuccess(message: string): void {
    alert(message);
  }

  showInfo(message: string): void {
    alert(message);
  }
}
