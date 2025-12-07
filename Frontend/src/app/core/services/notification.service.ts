import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // حالياً نستعمل alert، لاحقاً ممكن نستبدلها بتوست جميل
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
