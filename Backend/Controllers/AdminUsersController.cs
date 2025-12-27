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

            var courseIds = u.UserCourses.Select(uc => uc.CourseId).Distinct().ToList();
            var courseProgress = await BuildCourseProgressMap(id, courseIds);

            var activeCourses = new List<AdminUserCourseProgressDto>();
            var completedCourses = new List<AdminUserCourseProgressDto>();

            foreach (var userCourse in u.UserCourses)
            {
                var course = userCourse.Course;
                courseProgress.TryGetValue(userCourse.CourseId, out var progress);
                var completionPercent = CalculatePercent(progress.TotalLessons, progress.CompletedLessons);

                var courseDto = new AdminUserCourseProgressDto
                {
                    CourseId = course.Id,
                    CourseTitle = course.Title,
                    PurchasedAt = userCourse.PurchasedAt,
                    CompletedAt = progress.CompletedAt ?? userCourse.CompletedAt,
                    CompletionPercent = completionPercent
                };

                if (progress.IsCompleted)
                    completedCourses.Add(courseDto);
                else if (progress.InProgress || completionPercent > 0)
                    activeCourses.Add(courseDto);
                else
                    activeCourses.Add(courseDto);
            }

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
                ActiveCourses = activeCourses,
                CompletedCourses = completedCourses
            };

            return Ok(dto);
        }

        // GET: /api/admin/users/{id}/lms-overview
        [HttpGet("{id:int}/lms-overview")]
        public async Task<IActionResult> GetLmsOverview(int id)
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (user == null)
                return NotFound(new { message = "User not found." });

            var purchases = await _context.UserPurchases
                .Where(p => p.UserId == id)
                .Include(p => p.Course)
                .Include(p => p.Book)
                .Include(p => p.LearningPath)
                .ToListAsync();

            var coursePurchaseIds = purchases
                .Where(p => p.CourseId.HasValue)
                .Select(p => p.CourseId.Value)
                .ToList();

            var pathPurchaseIds = purchases
                .Where(p => p.LearningPathId.HasValue)
                .Select(p => p.LearningPathId.Value)
                .ToList();

            var directCourseIds = await _context.UserCourses
                .Where(uc => uc.UserId == id)
                .Select(uc => uc.CourseId)
                .Distinct()
                .ToListAsync();

            var pathCourseIds = pathPurchaseIds.Count == 0
                ? new List<int>()
                : await _context.LearningPathCourses
                    .Where(lpc => pathPurchaseIds.Contains(lpc.LearningPathId))
                    .Select(lpc => lpc.CourseId)
                    .Distinct()
                    .ToListAsync();

            var courseIds = directCourseIds
                .Union(pathCourseIds)
                .Union(coursePurchaseIds)
                .Distinct()
                .ToList();

            var courses = await _context.Courses
                .Where(c => courseIds.Contains(c.Id))
                .Select(c => new { c.Id, c.Title })
                .ToListAsync();

            var courseProgress = await BuildCourseProgressMap(id, courseIds);

            var activeCourses = new List<AdminUserCourseProgressDto>();
            var completedCourses = new List<AdminUserCourseProgressDto>();

            foreach (var course in courses)
            {
                var progress = courseProgress.TryGetValue(course.Id, out var cp) ? cp : new CourseProgressInfo(0, 0, false, false, null);
                var completionPercent = CalculatePercent(progress.TotalLessons, progress.CompletedLessons);

                var dto = new AdminUserCourseProgressDto
                {
                    CourseId = course.Id,
                    CourseTitle = course.Title,
                    CompletionPercent = completionPercent,
                    CompletedAt = progress.CompletedAt
                };

                if (progress.IsCompleted)
                    completedCourses.Add(dto);
                else if (progress.InProgress)
                    activeCourses.Add(dto);
            }

            var learningPaths = new List<AdminUserLearningPathProgressDto>();
            if (pathPurchaseIds.Count > 0)
            {
                var pathCourses = await _context.LearningPathCourses
                    .Where(lpc => pathPurchaseIds.Contains(lpc.LearningPathId))
                    .GroupBy(lpc => lpc.LearningPathId)
                    .ToListAsync();

                var pathDetails = await _context.LearningPaths
                    .Where(lp => pathPurchaseIds.Contains(lp.Id))
                    .Select(lp => new { lp.Id, lp.Title })
                    .ToDictionaryAsync(lp => lp.Id, lp => lp.Title);

                foreach (var group in pathCourses)
                {
                    var courseList = group.Select(g => g.CourseId).Distinct().ToList();
                    var completedCount = courseList.Count(cid =>
                        courseProgress.TryGetValue(cid, out var cp) && cp.IsCompleted);
                    var percent = CalculatePercent(courseList.Count, completedCount);

                    learningPaths.Add(new AdminUserLearningPathProgressDto
                    {
                        LearningPathId = group.Key,
                        LearningPathTitle = pathDetails.TryGetValue(group.Key, out var title) ? title : string.Empty,
                        CompletionPercent = percent
                    });
                }
            }

            var coursePurchases = purchases
                .Where(p => p.CourseId.HasValue)
                .Select(p => new
                {
                    id = p.CourseId.Value,
                    title = p.Course?.Title ?? string.Empty,
                    purchasedAt = p.PurchasedAt
                })
                .ToList();

            var bookPurchases = purchases
                .Where(p => p.BookId.HasValue)
                .Select(p => new
                {
                    id = p.BookId.Value,
                    title = p.Book?.Title ?? string.Empty,
                    purchasedAt = p.PurchasedAt
                })
                .ToList();

            var pathPurchases = purchases
                .Where(p => p.LearningPathId.HasValue)
                .Select(p => new
                {
                    id = p.LearningPathId.Value,
                    title = p.LearningPath?.Title ?? string.Empty,
                    purchasedAt = p.PurchasedAt
                })
                .ToList();

            return Ok(new
            {
                purchases = new
                {
                    courses = coursePurchases,
                    books = bookPurchases,
                    paths = pathPurchases
                },
                courses = new
                {
                    active = activeCourses,
                    completed = completedCourses
                },
                learningPaths
            });
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

        private static double CalculatePercent(int total, int completed)
        {
            if (total <= 0)
                return 0;

            return Math.Min(100, Math.Round((double)completed / total * 100, 2));
        }

        private async Task<Dictionary<int, CourseProgressInfo>> BuildCourseProgressMap(int userId, IEnumerable<int> courseIds)
        {
            var ids = courseIds?.Distinct().ToList() ?? new List<int>();
            if (ids.Count == 0)
                return new Dictionary<int, CourseProgressInfo>();

            var totalLessons = await _context.CourseLessons
                .Where(l => ids.Contains(l.Section.CourseId))
                .GroupBy(l => l.Section.CourseId)
                .Select(g => new { CourseId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CourseId, x => x.Count);

            var completedLessons = await _context.UserLessonProgresses
                .Where(p => p.UserId == userId && ids.Contains(p.Lesson.Section.CourseId))
                .GroupBy(p => p.Lesson.Section.CourseId)
                .Select(g => new
                {
                    CourseId = g.Key,
                    Count = g.Count(),
                    LastCompletedAt = g.Max(x => x.CompletedAt)
                })
                .ToListAsync();

            var map = new Dictionary<int, CourseProgressInfo>();

            foreach (var courseId in ids)
            {
                totalLessons.TryGetValue(courseId, out var total);
                var completed = completedLessons.FirstOrDefault(x => x.CourseId == courseId);
                var completedCount = completed?.Count ?? 0;
                var isCompleted = total == 0 || completedCount >= total;
                var inProgress = completedCount > 0 && !isCompleted;
                var completedAt = isCompleted ? completed?.LastCompletedAt : (DateTime?)null;

                map[courseId] = new CourseProgressInfo(total, completedCount, isCompleted, inProgress, completedAt);
            }

            return map;
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

    public class AdminUserLearningPathProgressDto
    {
        public int LearningPathId { get; set; }
        public string LearningPathTitle { get; set; }
        public double CompletionPercent { get; set; }
    }

    internal record CourseProgressInfo(int TotalLessons, int CompletedLessons, bool IsCompleted, bool InProgress, DateTime? CompletedAt);
}
