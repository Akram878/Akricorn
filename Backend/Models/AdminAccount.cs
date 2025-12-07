using System;

namespace Backend.Models
{
    public enum AdminRole
    {
        Owner = 1,
        Admin = 2
    }

    public class AdminAccount
    {
        public int Id { get; set; }
        public string Username { get; set; }    // للدخول للداشبورد
        public string PasswordHash { get; set; }
        public AdminRole Role { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
