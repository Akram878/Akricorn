using System;

namespace Backend.Models
{
    public class FileMetadata
    {
        public int Id { get; set; }

        public string OriginalName { get; set; }
        public string StoredName { get; set; }
        public long Size { get; set; }
        public string MimeType { get; set; }
        public string Extension { get; set; }

        public int? ImageWidth { get; set; }
        public int? ImageHeight { get; set; }

        public string OwnerEntityType { get; set; }
        public int OwnerEntityId { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }
}