using System;

namespace Backend.Models
{
    // Courses owned by the user (My Courses)
    public class UserCourse
    {


        public int UserId { get; set; }
        public User User { get; set; }

        public int CourseId { get; set; }
        public Course Course { get; set; }

        public DateTime? PurchasedAt { get; set; }

        public DateTime? CompletedAt { get; set; }
    }
}
