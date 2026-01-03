namespace Backend.Models
{
    // Many-to-many join table between a learning path and courses
    public class LearningPathCourse
    {
        public int LearningPathId { get; set; }
        public LearningPath LearningPath { get; set; }

        public int CourseId { get; set; }
        public Course Course { get; set; }

        public int StepOrder { get; set; } // Order of this course within the path
    }
}
