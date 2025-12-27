using System.Collections.Generic;

namespace Backend.Models
{
    public class Book
    {
        public int Id { get; set; }

        public string Title { get; set; }        // اسم الكتاب
        public string Description { get; set; }  // وصف
        public decimal Price { get; set; }       // سعر الكتاب لو اشتريناه لوحده
       
        public bool IsActive { get; set; } = true;

        public string Category { get; set; } = string.Empty; // فئة الكتاب

        public string? ThumbnailUrl { get; set; }

        public List<BookFile> Files { get; set; } = new();
        public ICollection<BookRating> Ratings { get; set; } = new List<BookRating>();
    }
}
