using System;

namespace Backend.Models
{
    // الكورسات التي يملكها المستخدم (My Courses)
    public class UserCourse
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User User { get; set; }

        public int CourseId { get; set; }
        public Course Course { get; set; }

        public DateTime PurchasedAt { get; set; }
    }
}
