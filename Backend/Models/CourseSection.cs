using Backend.Models;

namespace Backend.Models
{
    public class CourseSection
    {
        public int Id { get; set; }
        public int CourseId { get; set; }
        public Course Course { get; set; }
        public string Title { get; set; }
        public int Order { get; set; }
        public List<CourseLesson> Lessons { get; set; } = new();
    }
}
