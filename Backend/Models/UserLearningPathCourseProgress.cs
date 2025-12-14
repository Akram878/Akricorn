using System;

namespace Backend.Models
{
    public class UserLearningPathCourseProgress
    {
        public int UserId { get; set; }
        public User User { get; set; }

        public int LearningPathId { get; set; }
        public LearningPath LearningPath { get; set; }

        public int CourseId { get; set; }
        public Course Course { get; set; }

        public DateTime CompletedAt { get; set; }
    }
}