using System;
using System.Collections.Generic;

namespace Backend.Models
{
    public class LearningPath
    {
        public int Id { get; set; }

        public string Title { get; set; }        // Path name
        public string Description { get; set; }  // Path description
        public bool IsActive { get; set; } = true;

        public decimal Price { get; set; }
        public double Rating { get; set; }
        public decimal Discount { get; set; }
        public string ThumbnailUrl { get; set; } // Thumbnail image for the path
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Courses associated with this path
        public ICollection<LearningPathCourse> LearningPathCourses { get; set; }
        public ICollection<LearningPathRating> Ratings { get; set; } = new List<LearningPathRating>();
    }
}
