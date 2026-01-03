namespace Backend.Models
{
    // Tool/useful link shown on the site or dashboard
    public class Tool
    {
        public int Id { get; set; }

        public string Name { get; set; }          // Tool name
        public string Description { get; set; }   // Short description
        public string Url { get; set; }           // Tool URL (e.g., external site)
        public string Category { get; set; }      // Category (Programming, study, productivity...)
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; } = 0; // For display ordering


        public string AvatarUrl { get; set; }     // Tool avatar image

        public ICollection<ToolFile> Files { get; set; }
        public ICollection<FileMetadata> FileMetadata { get; set; } = new List<FileMetadata>();
    }
}
