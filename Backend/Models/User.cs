using System;

namespace Backend.Models
{
    public class User
    {
        public int Id { get; set; }

        // Basic info
        public string Name { get; set; }
        public string Family { get; set; }

        // Contact
        public string CountryCode { get; set; }
        public string Number { get; set; }
        public string Email { get; set; }

        // Authentication
        // Store only the hash here, not the raw password
        public string PasswordHash { get; set; }

        // Profile
        public string City { get; set; }
        public DateTime? BirthDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        // Logic: "Birth date can only be edited once"
        public bool CanEditBirthDate { get; set; } = true;

        // User role within the platform (Student, Premium, etc)
        public string Role { get; set; } = "User";

        // Whether the account is active (for disabling from the dashboard)
        public bool IsActive { get; set; } = true;

        // Navigation Properties
        public virtual ICollection<UserCourse> UserCourses { get; set; }
        public virtual ICollection<UserBook> UserBooks { get; set; }

        public virtual ICollection<UserLearningPathCourseProgress> LearningPathCourseProgresses { get; set; }

        public virtual ICollection<UserLessonProgress> LessonProgresses { get; set; }
        public virtual ICollection<UserPurchase> Purchases { get; set; }
        public virtual ICollection<CourseRating> CourseRatings { get; set; }
        public virtual ICollection<BookRating> BookRatings { get; set; }
        public virtual ICollection<LearningPathRating> LearningPathRatings { get; set; }
        public User()
        {
            UserCourses = new HashSet<UserCourse>();
            UserBooks = new HashSet<UserBook>();
            LearningPathCourseProgresses = new HashSet<UserLearningPathCourseProgress>();
            LessonProgresses = new HashSet<UserLessonProgress>();
            Purchases = new HashSet<UserPurchase>();
            CourseRatings = new HashSet<CourseRating>();
            BookRatings = new HashSet<BookRating>();
            LearningPathRatings = new HashSet<LearningPathRating>();
        }
    }
}
