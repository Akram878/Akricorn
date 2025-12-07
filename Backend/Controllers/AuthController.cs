using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly PasswordHasher<User> _passwordHasher = new PasswordHasher<User>();
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // ============================
        //           Sign up
        // ============================
        [HttpPost("signup")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponse>> Signup([FromBody] SignupRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Invalid request payload." });
            }

            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email and password are required." });
            }

            var emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
            if (emailExists)
            {
                return BadRequest(new { message = "Email is already in use." });
            }

            var user = new User
            {
                Name = request.Name,
                Family = request.Family,
                CountryCode = request.CountryCode,
                Number = request.Number,
                Email = request.Email,
                City = request.City,
                BirthDate = request.BirthDate,
                CanEditBirthDate = true
            };

            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var dto = ToDto(user);
            var token = GenerateJwtToken(user);

            return Ok(new AuthResponse
            {
                User = dto,
                Token = token
            });
        }

        // ============================
        //            Login
        // ============================
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
        {
            if (request == null ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email and password are required." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null)
            {
                return BadRequest(new { message = "Invalid email or password." });
            }

            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
            if (result == PasswordVerificationResult.Failed)
            {
                return BadRequest(new { message = "Invalid email or password." });
            }

            var dto = ToDto(user);
            var token = GenerateJwtToken(user);

            return Ok(new AuthResponse
            {
                User = dto,
                Token = token
            });
        }

        // ============================
        //      Update profile
        //  (name / family / city / birthDate)
        // ============================
        [HttpPut("profile")]
        [Authorize]
        public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Invalid request payload." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.Id);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            {
                return BadRequest(new { message = "Current password is required to update profile." });
            }

            var verifyResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
            if (verifyResult == PasswordVerificationResult.Failed)
            {
                return BadRequest(new { message = "Current password is incorrect." });
            }

            user.Name = request.Name;
            user.Family = request.Family;
            user.City = request.City;

            // منطق تعديل تاريخ الميلاد مرة واحدة فقط
            if (request.BirthDate != user.BirthDate)
            {
                if (!user.CanEditBirthDate && user.BirthDate.HasValue)
                {
                    return BadRequest(new { message = "You can change your birth date only once." });
                }

                user.BirthDate = request.BirthDate;

                if (user.BirthDate.HasValue)
                {
                    user.CanEditBirthDate = false;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(ToDto(user));
        }

        // ============================
        //   Update account settings
        // (email / countryCode / number / password)
        // ============================
        [HttpPut("account")]
        [Authorize]
        public async Task<ActionResult<UserDto>> UpdateAccount([FromBody] UpdateAccountSettingsRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Invalid request payload." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.Id);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            {
                return BadRequest(new { message = "Current password is required to update account settings." });
            }

            var verifyResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
            if (verifyResult == PasswordVerificationResult.Failed)
            {
                return BadRequest(new { message = "Current password is incorrect." });
            }

            // تغيير الإيميل مع التحقق من عدم تكراره
            if (!string.Equals(user.Email, request.Email, StringComparison.OrdinalIgnoreCase))
            {
                var emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email && u.Id != user.Id);
                if (emailExists)
                {
                    return BadRequest(new { message = "Email is already in use." });
                }

                user.Email = request.Email;
            }

            user.CountryCode = request.CountryCode;
            user.Number = request.Number;

            if (!string.IsNullOrWhiteSpace(request.NewPassword))
            {
                user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
            }

            await _context.SaveChangesAsync();
            return Ok(ToDto(user));
        }

        // ============================
        //        Delete account
        // ============================
        [HttpPost("delete")]
        [Authorize]
        public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Invalid request payload." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.Id);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Account deleted successfully." });
        }

        // ============================
        //          Helpers
        // ============================

        private static UserDto ToDto(User user)
        {
            return new UserDto
            {
                Id = user.Id,
                Name = user.Name,
                Family = user.Family,
                CountryCode = user.CountryCode,
                Number = user.Number,
                Email = user.Email,
                City = user.City,
                BirthDate = user.BirthDate,
                CanEditBirthDate = user.CanEditBirthDate
            };
        }

        private string GenerateJwtToken(User user)
        {
            var jwtSection = _configuration.GetSection("Jwt");
            var key = jwtSection["Key"];
            var issuer = jwtSection["Issuer"];
            var audience = jwtSection["Audience"];

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim("name", user.Name ?? string.Empty),
                new Claim("family", user.Family ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    // ============================
    //        DTO classes
    // ============================

    public class SignupRequest
    {
        public string Name { get; set; }
        public string Family { get; set; }
        public string CountryCode { get; set; }
        public string Number { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }

        public string City { get; set; }
        public DateTime? BirthDate { get; set; }
    }

    public class LoginRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class UpdateProfileRequest
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Family { get; set; }
        public string City { get; set; }
        public DateTime? BirthDate { get; set; }
        public string CurrentPassword { get; set; }
    }

    public class UpdateAccountSettingsRequest
    {
        public int Id { get; set; }
        public string Email { get; set; }
        public string CountryCode { get; set; }
        public string Number { get; set; }
        public string CurrentPassword { get; set; }
        public string NewPassword { get; set; }
    }

    public class DeleteAccountRequest
    {
        public int Id { get; set; }
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Family { get; set; }
        public string CountryCode { get; set; }
        public string Number { get; set; }
        public string Email { get; set; }

        public string City { get; set; }
        public DateTime? BirthDate { get; set; }
        public bool CanEditBirthDate { get; set; }
    }

    public class AuthResponse
    {
        public UserDto User { get; set; }
        public string Token { get; set; }
    }
}
