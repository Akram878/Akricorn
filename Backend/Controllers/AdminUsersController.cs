using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/admin/users")]
    [Authorize(Policy = "AdminOnly")]
    public class AdminUsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminUsersController(AppDbContext context)
        {
            _context = context;
        }

        // GET: /api/admin/users
        // إرجاع جميع المستخدمين
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AdminUserDto>>> GetAll()
        {
            var users = await _context.Users.ToListAsync();

            var result = users.Select(u => new AdminUserDto
            {
                Id = u.Id,
                Name = u.Name,
                Family = u.Family,
                Email = u.Email,
                CountryCode = u.CountryCode,
                Number = u.Number,
                City = u.City,
                Role = u.Role,
                IsActive = u.IsActive,
                CanEditBirthDate = u.CanEditBirthDate
            }).ToList();

            return Ok(result);
        }

        // GET: /api/admin/users/{id}
        // إرجاع مستخدم واحد بالتفصيل
        [HttpGet("{id:int}")]
        public async Task<ActionResult<AdminUserDto>> GetById(int id)
        {
            var u = await _context.Users.FirstOrDefaultAsync(x => x.Id == id);

            if (u == null)
                return NotFound(new { message = "User not found." });

            var dto = new AdminUserDto
            {
                Id = u.Id,
                Name = u.Name,
                Family = u.Family,
                Email = u.Email,
                CountryCode = u.CountryCode,
                Number = u.Number,
                City = u.City,
                Role = u.Role,
                IsActive = u.IsActive,
                CanEditBirthDate = u.CanEditBirthDate
            };

            return Ok(dto);
        }

        // PATCH: /api/admin/users/{id}/toggle
        // تفعيل / تعطيل حساب المستخدم
        [HttpPatch("{id:int}/toggle")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var u = await _context.Users.FirstOrDefaultAsync(x => x.Id == id);

            if (u == null)
                return NotFound(new { message = "User not found." });

            u.IsActive = !u.IsActive;
            await _context.SaveChangesAsync();

            return Ok(new { message = "User status changed.", isActive = u.IsActive });
        }

        // PATCH: /api/admin/users/{id}/role
        // تغيير دور المستخدم (Student, Premium, Moderator, ...)
        [HttpPatch("{id:int}/role")]
        public async Task<IActionResult> ChangeRole(int id, [FromBody] AdminUpdateUserRoleRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Role))
                return BadRequest(new { message = "Role is required." });

            var u = await _context.Users.FirstOrDefaultAsync(x => x.Id == id);

            if (u == null)
                return NotFound(new { message = "User not found." });

            u.Role = request.Role;
            await _context.SaveChangesAsync();

            return Ok(new { message = "User role updated.", role = u.Role });
        }
    }

    // DTOs خاصة بلوحة تحكم الأدمن
    public class AdminUserDto
    {
        public int Id { get; set; }

        public string Name { get; set; }
        public string Family { get; set; }

        public string CountryCode { get; set; }
        public string Number { get; set; }
        public string Email { get; set; }

        public string City { get; set; }
        public bool CanEditBirthDate { get; set; }

        public string Role { get; set; }
        public bool IsActive { get; set; }
    }

    public class AdminUpdateUserRoleRequest
    {
        public string Role { get; set; }
    }
}
