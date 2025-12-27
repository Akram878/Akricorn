using System;

namespace Backend.Models
{
    public class LearningPathRating
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User User { get; set; }

        public int LearningPathId { get; set; }
        public LearningPath LearningPath { get; set; }

        public int Rating { get; set; }
        public string Comment { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}