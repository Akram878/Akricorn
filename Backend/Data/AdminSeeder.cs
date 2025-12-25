using Backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class AdminSeeder
    {
        private const string DefaultUsername = "owner";
        private const string DefaultPassword = "Owner123!";

        private readonly AppDbContext _db;
        private readonly PasswordHasher<AdminAccount> _passwordHasher;

        public AdminSeeder(AppDbContext db, PasswordHasher<AdminAccount> passwordHasher)
        {
            _db = db;
            _passwordHasher = passwordHasher;
        }

        public async Task SeedAsync(CancellationToken cancellationToken = default)
        {
            if (!await _db.Database.CanConnectAsync(cancellationToken))
            {
                return;
            }

            if (await _db.AdminAccounts.AnyAsync(cancellationToken))
            {
                return;
            }

            var admin = new AdminAccount
            {
                Username = DefaultUsername,
                Role = AdminRole.Owner,
                IsActive = true
            };

            admin.PasswordHash = _passwordHasher.HashPassword(admin, DefaultPassword);

            _db.AdminAccounts.Add(admin);
            await _db.SaveChangesAsync(cancellationToken);
        }
    }
}