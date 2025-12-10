using Backend.Models;

namespace Backend.Models
{
    public class CourseLesson
    {
        public int Id { get; set; }
        public int SectionId { get; set; }
        public CourseSection Section { get; set; }
        public string Title { get; set; }
        public int Order { get; set; }
        public List<CourseLessonFile> Files { get; set; } = new();
    }
}
