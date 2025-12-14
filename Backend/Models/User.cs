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
        // نخزن هنا الـ Hash فقط وليس الباسورد الخام
        public string PasswordHash { get; set; }

        // Profile
        public string City { get; set; }
        public DateTime? BirthDate { get; set; }

        // منطق "يمكن تعديل تاريخ الميلاد مرة واحدة فقط"
        public bool CanEditBirthDate { get; set; } = true;

        // دور المستخدم داخل المنصة (Student, Premium, etc)
        public string Role { get; set; } = "User";

        // هل الحساب مفعّل أم لا (للتعطيل من الداشبورد)
        public bool IsActive { get; set; } = true;

        // Navigation Properties
        public virtual ICollection<UserCourse> UserCourses { get; set; }
        public virtual ICollection<UserBook> UserBooks { get; set; }

        public virtual ICollection<UserLearningPathCourseProgress> LearningPathCourseProgresses { get; set; }

        public User()
        {
            UserCourses = new HashSet<UserCourse>();
            UserBooks = new HashSet<UserBook>();
            LearningPathCourseProgresses = new HashSet<UserLearningPathCourseProgress>();
        }
    }
}
