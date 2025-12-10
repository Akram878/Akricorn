namespace Backend.Models
{
    public class CourseLessonFile
    {
        public int Id { get; set; }

        public int LessonId { get; set; }
        public CourseLesson Lesson { get; set; }

        public string FileName { get; set; }
        public string FileUrl { get; set; }

        public long SizeBytes { get; set; }
        public string ContentType { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}
