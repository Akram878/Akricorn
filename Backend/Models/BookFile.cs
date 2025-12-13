namespace Backend.Models
{
    public class BookFile
    {
        public int Id { get; set; }
        public int BookId { get; set; }
        public string FileName { get; set; }
        public string FileUrl { get; set; }
        public long SizeBytes { get; set; }
        public string ContentType { get; set; }

        public Book Book { get; set; }
    }
}