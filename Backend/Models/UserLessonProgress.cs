using System;
using System;

namespace Backend.Models
{
    public class UserLessonProgress
    {
        public int UserId { get; set; }
        public User User { get; set; }

        public int LessonId { get; set; }
        public CourseLesson Lesson { get; set; }

        public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
    }
}