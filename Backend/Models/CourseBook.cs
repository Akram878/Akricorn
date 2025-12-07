namespace Backend.Models
{
    // جدول ربط Many-to-Many بين Course و Book
    public class CourseBook
    {
        public int CourseId { get; set; }
        public Course Course { get; set; }

        public int BookId { get; set; }
        public Book Book { get; set; }
    }
}
