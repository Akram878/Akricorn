namespace Backend.Models
{
    public class ToolFile
    {
        public int Id { get; set; }
        public int ToolId { get; set; }
        public string FileName { get; set; }
        public string FileUrl { get; set; }
        public long SizeBytes { get; set; }
        public string ContentType { get; set; }

        public int? FileMetadataId { get; set; }
        public FileMetadata FileMetadata { get; set; }
        public Tool Tool { get; set; }
    }
}