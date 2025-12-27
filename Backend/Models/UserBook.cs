using System;

namespace Backend.Models
{
    // User book ownership and completion tracking
    public class UserBook
    {
        public int UserId { get; set; }
        public User User { get; set; }

        public int BookId { get; set; }
        public Book Book { get; set; }

        public DateTime? GrantedAt { get; set; }
        public DateTime? CompletedAt { get; set; }

        public bool? IsFromCourse { get; set; }
    }
}
