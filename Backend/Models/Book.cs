using System.Collections.Generic;

namespace Backend.Models
{
    public class Book
    {
        public int Id { get; set; }

        public string Title { get; set; }        // Book title
        public string Description { get; set; }  // Description
        public decimal Price { get; set; }       // Book price if purchased individually
       
        public bool IsActive { get; set; } = true;

        public string Category { get; set; } = string.Empty; // Book category

        public string? ThumbnailUrl { get; set; }

        public List<BookFile> Files { get; set; } = new();
        public ICollection<BookRating> Ratings { get; set; } = new List<BookRating>();
    }
}
