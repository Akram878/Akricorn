using System;
using System.Collections.Generic;

namespace Backend.Models
{
    public class LearningPath
    {
        public int Id { get; set; }

        public string Title { get; set; }        // اسم المسار
        public string Description { get; set; }  // وصف المسار
        public bool IsActive { get; set; } = true;

        public decimal Price { get; set; }
        public double Rating { get; set; }
        public decimal Discount { get; set; }
        public string ThumbnailUrl { get; set; } // صورة رمزية للمسار
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // الكورسات المرتبطة بهذا المسار
        public ICollection<LearningPathCourse> LearningPathCourses { get; set; }
        public ICollection<LearningPathRating> Ratings { get; set; } = new List<LearningPathRating>();
    }
}
