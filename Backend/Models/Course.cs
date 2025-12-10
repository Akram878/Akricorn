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
        public bool IsActive { get; set; } = true;

        // خصائص العرض
        public int Hours { get; set; }          // عدد ساعات الكورس
        public string Category { get; set; }    // Beginner, Intermediate...
        public double Rating { get; set; }      // تقييم 0 – 5

        // 🔥 صورة الكورس
        public string ThumbnailUrl { get; set; }

      

        // مسارات يتبع لها الكورس
        public ICollection<LearningPathCourse> LearningPathCourses { get; set; }
    }
}
