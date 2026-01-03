using System;
using System.Collections.Generic;

namespace Backend.Models
{
    public class Course
    {
        public List<CourseSection> Sections { get; set; } = new();
        public int Id { get; set; }

        public string Title { get; set; }       // Course title
        public string Description { get; set; } // Brief description
        public decimal Price { get; set; }      // Price
        public decimal Discount { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        // Display properties
        public int Hours { get; set; }          // Number of course hours
        public string Category { get; set; }    // Beginner, Intermediate...
        public double Rating { get; set; }      // Rating 0 – 5
        public int TotalSections { get; set; }
        public int TotalLessons { get; set; }
        // 🔥 Course image
        public string ThumbnailUrl { get; set; }


        public ICollection<UserCourse> UserCourses { get; set; } = new List<UserCourse>();
        public ICollection<CourseRating> Ratings { get; set; } = new List<CourseRating>();
        // Learning paths this course belongs to
        public ICollection<LearningPathCourse> LearningPathCourses { get; set; }
    }
}
