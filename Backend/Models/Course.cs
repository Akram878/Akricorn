using System;
using System.Collections.Generic;

namespace Backend.Models
{
    public class Course
    {
        public List<CourseSection> Sections { get; set; } = new();
        public int Id { get; set; }

        public string Title { get; set; }       // اسم الكورس
        public string Description { get; set; } // وصف مختصر
        public decimal Price { get; set; }      // السعر
        public decimal Discount { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        // خصائص العرض
        public int Hours { get; set; }          // عدد ساعات الكورس
        public string Category { get; set; }    // Beginner, Intermediate...
        public double Rating { get; set; }      // تقييم 0 – 5
        public int TotalSections { get; set; }
        public int TotalLessons { get; set; }
        // 🔥 صورة الكورس
        public string ThumbnailUrl { get; set; }


        public ICollection<UserCourse> UserCourses { get; set; } = new List<UserCourse>();
        public ICollection<CourseRating> Ratings { get; set; } = new List<CourseRating>();
        // مسارات يتبع لها الكورس
        public ICollection<LearningPathCourse> LearningPathCourses { get; set; }
    }
}
