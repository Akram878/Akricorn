using System;
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
        public async Task<ActionResult<AdminUserDetailsDto>> GetById(int id)
        {
            var u = await _context.Users
                .Include(x => x.UserCourses)
                    .ThenInclude(uc => uc.Course)
                .Include(x => x.LessonProgresses)
                    .ThenInclude(p => p.Lesson)
                        .ThenInclude(l => l.Section)
                .Include(x => x.Purchases)
                    .ThenInclude(p => p.Course)
                .Include(x => x.Purchases)
                    .ThenInclude(p => p.Book)
                .Include(x => x.Purchases)
                    .ThenInclude(p => p.LearningPath)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (u == null)
                return NotFound(new { message = "User not found." });

            var courseProgress = BuildCourseProgress(u);

            var dto = new AdminUserDetailsDto
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
                CanEditBirthDate = u.CanEditBirthDate,
                Purchases = u.Purchases.Select(p => new AdminUserPurchaseDto
                {
                    Id = p.Id,
                    PurchaseType = p.PurchaseType.ToString(),
                    CourseId = p.CourseId,
                    BookId = p.BookId,
                    LearningPathId = p.LearningPathId,
                    PurchasedAt = p.PurchasedAt
                }).ToList(),
                ActiveCourses = courseProgress.Active,
                CompletedCourses = courseProgress.Completed
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

        private static (List<AdminUserCourseProgressDto> Active, List<AdminUserCourseProgressDto> Completed) BuildCourseProgress(User user)
        {
            var progressByCourse = user.LessonProgresses
                .GroupBy(p => p.Lesson.Section.CourseId)
                .ToDictionary(g => g.Key, g => g.Count());

            var active = new List<AdminUserCourseProgressDto>();
            var completed = new List<AdminUserCourseProgressDto>();

            foreach (var userCourse in user.UserCourses)
            {
                var course = userCourse.Course;
                var totalLessons = course.TotalLessons;
                var completedLessons = progressByCourse.TryGetValue(course.Id, out var count) ? count : 0;
                var completionPercent = totalLessons == 0
                    ? 0
                    : Math.Round((double)completedLessons / totalLessons * 100, 2);

                var dto = new AdminUserCourseProgressDto
                {
                    CourseId = course.Id,
                    CourseTitle = course.Title,
                    PurchasedAt = userCourse.PurchasedAt,
                    CompletedAt = userCourse.CompletedAt,
                    CompletionPercent = completionPercent
                };

                if (userCourse.CompletedAt.HasValue)
                    completed.Add(dto);
                else
                    active.Add(dto);
            }

            return (active, completed);
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

    public class AdminUserDetailsDto : AdminUserDto
    {
        public List<AdminUserPurchaseDto> Purchases { get; set; } = new();
        public List<AdminUserCourseProgressDto> ActiveCourses { get; set; } = new();
        public List<AdminUserCourseProgressDto> CompletedCourses { get; set; } = new();
    }

    public class AdminUserPurchaseDto
    {
        public int Id { get; set; }
        public string PurchaseType { get; set; }
        public int? CourseId { get; set; }
        public int? BookId { get; set; }
        public int? LearningPathId { get; set; }
        public DateTime PurchasedAt { get; set; }
    }

    public class AdminUserCourseProgressDto
    {
        public int CourseId { get; set; }
        public string CourseTitle { get; set; }
        public DateTime? PurchasedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public double CompletionPercent { get; set; }
    }
}
