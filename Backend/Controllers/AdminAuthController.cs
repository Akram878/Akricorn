using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminAuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly PasswordHasher<AdminAccount> _passwordHasher;

        public AdminAuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
            _passwordHasher = new PasswordHasher<AdminAccount>();
        }

        // POST: /api/admin/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AdminLoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Username and password are required." });
            }

            var admin = await _context.AdminAccounts
                .FirstOrDefaultAsync(a => a.Username == request.Username && a.IsActive);

            if (admin == null)
            {
                return Unauthorized(new { message = "Invalid credentials." });
            }

            var result = _passwordHasher.VerifyHashedPassword(admin, admin.PasswordHash, request.Password);

            if (result != PasswordVerificationResult.Success)
            {
                return Unauthorized(new { message = "Invalid credentials." });
            }

            var token = GenerateAdminJwt(admin);

            var response = new AdminLoginResponse
            {
                Token = token,
                Username = admin.Username,
                Role = admin.Role.ToString()
            };

            return Ok(response);
        }

        // ======================
        //    Helpers
        // ======================

        private string GenerateAdminJwt(AdminAccount admin)
        {
            var jwtSection = _config.GetSection("Jwt");
            var key = jwtSection["Key"];
            var issuer = jwtSection["Issuer"];
            var audience = jwtSection["Audience"];

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim("AdminId", admin.Id.ToString()),
                new Claim("AdminUsername", admin.Username),
                new Claim("AdminRole", admin.Role.ToString()),
                new Claim("IsAdmin", "true")
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(4),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    // ==========================
    //   DTOs (طلب / رد)
    // ==========================

    public class AdminLoginRequest
    {
        [System.Text.Json.Serialization.JsonPropertyName("username")]
        public string Username { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("password")]
        public string Password { get; set; }
    }

    public class AdminLoginResponse
    {
        public string Token { get; set; }
        public string Username { get; set; }
        public string Role { get; set; }
    }
}
