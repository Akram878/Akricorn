using System;

namespace Backend.Models
{
    public enum PaymentStatus
    {
        Pending = 0,
        Succeeded = 1,
        Failed = 2,
        Cancelled = 3
    }

    // عملية دفع (افتراضية) لكورس / كتاب / مسار
    public class Payment
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User User { get; set; }

        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";

        public PaymentStatus Status { get; set; } = PaymentStatus.Succeeded;

        /// <summary>
        /// "Course" / "Book" / "LearningPath"
        /// </summary>
        public string TargetType { get; set; }
        public int TargetId { get; set; }

        public string Description { get; set; }

        // اسم مزوّد الدفع الافتراضي
        public string Provider { get; set; } = "DemoPay";

        // رقم مرجعي افتراضي للعملية
        public string ExternalReference { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
    }
}
