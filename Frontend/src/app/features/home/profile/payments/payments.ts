import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaymentsService, Payment } from '../../../../core/services/payments.service';

@Component({
  selector: 'app-profile-payments',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule],
  templateUrl: './payments.html',
  styleUrls: ['./payments.scss'],
})
export class Payments implements OnInit {
  payments: Payment[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(private paymentsService: PaymentsService) {}

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.isLoading = true;
    this.error = null;

    this.paymentsService.getMyPayments().subscribe({
      next: (data) => {
        this.payments = data;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load payments.';
        this.isLoading = false;
      },
    });
  }
}
