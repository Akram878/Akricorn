using System;

namespace Backend.Models
{
    public enum PurchaseType
    {
        Course = 0,
        Book = 1,
        LearningPath = 2
    }

    public class UserPurchase
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User User { get; set; }

        public PurchaseType PurchaseType { get; set; }

        public int? CourseId { get; set; }
        public Course Course { get; set; }

        public int? BookId { get; set; }
        public Book Book { get; set; }

        public int? LearningPathId { get; set; }
        public LearningPath LearningPath { get; set; }

        public DateTime PurchasedAt { get; set; } = DateTime.UtcNow;
    }
}