namespace Backend.Models
{
    // جدول ربط Many-to-Many بين مسار التعلّم والكورسات
    public class LearningPathCourse
    {
        public int LearningPathId { get; set; }
        public LearningPath LearningPath { get; set; }

        public int CourseId { get; set; }
        public Course Course { get; set; }

        public int StepOrder { get; set; } // ترتيب هذا الكورس داخل المسار
    }
}
