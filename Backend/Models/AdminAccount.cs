using System;

namespace Backend.Models
{
    public enum AdminRole
    {
        SuperAdmin = 1,
        Owner = 2,
        Admin = 3
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
