using System;

namespace Backend.Models
{
    // الكتب التي يملكها المستخدم (كشراء مباشر أو مجانية من كورس)
    public class UserBook
    {


        public int UserId { get; set; }
        public User User { get; set; }

        public int BookId { get; set; }
        public Book Book { get; set; }

        public DateTime? GrantedAt { get; set; }

        // true لو حصل عليها مجاناً من كورس، false لو اشتراها مباشرة
        public bool? IsFromCourse { get; set; }
    }
}
