import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NotificationService } from './notification.service';

interface DownloadOptions {
  fileName?: string;
  openInNewTab?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FileDownloadService {
  constructor(private http: HttpClient, private notification: NotificationService) {}

  download(url: string, options: DownloadOptions = {}): void {
    if (!url) {
      this.notification.showError('File is not available.');
      return;
    }

    this.http.get(url, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (response: HttpResponse<Blob>) => {
        if (!response.body) {
          this.notification.showError('تعذر تنزيل الملف.');
          return;
        }

        const resolvedName =
          this.resolveFileName(response.headers.get('content-disposition')) ||
          options.fileName ||
          'download';

        const objectUrl = URL.createObjectURL(response.body);

        if (options.openInNewTab) {
          const opened = window.open(objectUrl, '_blank', 'noopener');
          if (!opened) {
            this.triggerDownload(objectUrl, resolvedName);
          }
        } else {
          this.triggerDownload(objectUrl, resolvedName);
        }

        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      },
      error: () => {
        this.notification.showError('تعذر تنزيل الملف.');
      },
    });
  }

  private triggerDownload(objectUrl: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.rel = 'noopener';
    link.click();
  }

  private resolveFileName(header: string | null): string | null {
    if (!header) {
      return null;
    }

    const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (utfMatch?.[1]) {
      return decodeURIComponent(utfMatch[1]);
    }

    const asciiMatch = /filename="?([^";]+)"?/i.exec(header);
    if (asciiMatch?.[1]) {
      return asciiMatch[1];
    }

    return null;
  }
}
