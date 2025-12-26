using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/lms")]
    public class LmsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LmsController(AppDbContext context)
        {
            _context = context;
        }

        // ============================
        //             Stats
        // ============================
        [HttpGet("stats")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLmsStats()
        {
            var activeCourses = await _context.Courses.CountAsync(c => c.IsActive);
            var activeLearningPaths = await _context.LearningPaths.CountAsync(p => p.IsActive);
            var activeBooks = await _context.Books.CountAsync(b => b.IsActive);

            return Ok(new
            {
                activeCourses,
                activeLearningPaths,
                activeBooks
            });
        }
        // ============================
        //         Public Courses
        // ============================
        [HttpGet("courses")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCourses()
        {
            var courses = await _context.Courses
                .Where(c => c.IsActive)
                .Select(c => new
                {
                    c.Id,
                    c.Title,
                    c.Description,
                    c.ThumbnailUrl,
                    c.Price,
                    c.Hours,
                    c.Category,
                    c.Rating,
                    pathTitle = c.LearningPathCourses
                        .Select(lp => lp.LearningPath.Title)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(courses);
        }

        // ============================
        //       Course Content
        // ============================
        [HttpGet("courses/{courseId}/content")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCourseContent(int courseId)
        {
            var course = await _context.Courses
                .Include(c => c.Sections)
                    .ThenInclude(s => s.Lessons)
                        .ThenInclude(l => l.Files)
                .FirstOrDefaultAsync(c => c.Id == courseId && c.IsActive);

            if (course == null)
                return NotFound(new { message = "Course not found." });

            var result = course.Sections
                .OrderBy(s => s.Order)
                .Select(s => new
                {
                    sectionId = s.Id,
                    sectionTitle = s.Title,
                    sectionOrder = s.Order,
                    lessons = s.Lessons
                        .OrderBy(l => l.Order)
                        .Select(l => new
                        {
                            lessonId = l.Id,
                            lessonTitle = l.Title,
                            lessonOrder = l.Order,
                            files = l.Files
                                .OrderBy(f => f.Id)
                                .Select(f => new
                                {
                                    fileId = f.Id,
                                    fileName = f.FileName,
                                    fileUrl = BuildLessonFileUrl(f.Id),
                                    uploadedAt = f.UploadedAt
                                })
                        })
                });

            return Ok(result);
        }

        // ============================
        //         Public Books
        // ============================
        [HttpGet("books")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBooks()
        {
            var books = await _context.Books
                .Where(b => b.IsActive)
                .Select(b => new
                {
                    b.Id,
                    b.Title,
                    b.Description,
                    b.Price,
                    b.Category,
                    b.ThumbnailUrl
                })
                .ToListAsync();

            return Ok(books);
        }

        // ============================
        //      Purchase Book
        // ============================
        [HttpPost("books/{bookId}/purchase")]
        [Authorize]
        public async Task<IActionResult> PurchaseBook(int bookId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                    return Unauthorized(new { message = "Unauthorized." });

                if (!user.IsActive)
                    return StatusCode(403, new { message = "Your account has been disabled." });

                var book = await _context.Books
                    .FirstOrDefaultAsync(b => b.Id == bookId && b.IsActive);

                if (book == null)
                    return NotFound(new { message = "Book not found." });

                var alreadyOwned = await _context.UserBooks
                    .AnyAsync(ub => ub.UserId == userId && ub.BookId == bookId);

                if (alreadyOwned)
                    return BadRequest(new { message = "You already own this book." });

                var userBook = new UserBook
                {
                    UserId = userId.Value,
                    BookId = bookId,
                    GrantedAt = DateTime.UtcNow,
                    IsFromCourse = false
                };

                _context.UserBooks.Add(userBook);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Book purchased successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Error while purchasing book.",
                    inner = ex.InnerException?.Message ?? ex.Message
                });
            }
        }

        // ============================
        //         My Courses
        // ============================
        [HttpGet("my-courses")]
        [Authorize]
        public async Task<IActionResult> GetMyCourses()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var myCourses = await _context.UserCourses
                .Where(uc => uc.UserId == userId.Value)
                .Include(uc => uc.Course)
                  .ThenInclude(c => c.LearningPathCourses)
                        .ThenInclude(lp => lp.LearningPath)
                .Select(uc => new
                {
                    uc.Course.Id,
                    uc.Course.Title,
                    uc.Course.Description,
                    uc.Course.Price,
                    uc.Course.Hours,
                    uc.Course.Category,
                    uc.Course.ThumbnailUrl,
                    pathTitle = uc.Course.LearningPathCourses
                        .Select(lp => lp.LearningPath.Title)
                        .FirstOrDefault(),
                    uc.PurchasedAt,
                    uc.CompletedAt
                })
                .ToListAsync();

            return Ok(myCourses);
        }

        [HttpGet("my-courses/{courseId}")]
        [Authorize]
        public async Task<IActionResult> GetMyCourseDetails(int courseId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var userCourse = await _context.UserCourses
                .Where(uc => uc.UserId == userId.Value && uc.CourseId == courseId)
                .Include(uc => uc.Course)
                    .ThenInclude(c => c.Sections)
                        .ThenInclude(s => s.Lessons)
                            .ThenInclude(l => l.Files)
                .Include(uc => uc.Course)
                    .ThenInclude(c => c.LearningPathCourses)
                        .ThenInclude(lp => lp.LearningPath)
                .FirstOrDefaultAsync();

            if (userCourse == null)
                return NotFound(new { message = "Course not found in your library." });

            var course = userCourse.Course;

            var pathIds = course.LearningPathCourses?
                .Select(lp => lp.LearningPathId)
                .Distinct()
                .ToList() ?? new List<int>();

            var totalByPath = pathIds.Count == 0
                ? new Dictionary<int, int>()
                : await _context.LearningPathCourses
                    .Where(lpc => pathIds.Contains(lpc.LearningPathId))
                    .GroupBy(lpc => lpc.LearningPathId)
                    .Select(g => new { PathId = g.Key, TotalCourses = g.Count() })
                    .ToDictionaryAsync(x => x.PathId, x => x.TotalCourses);

            var completedByPath = pathIds.Count == 0
                ? new Dictionary<int, int>()
                : await _context.UserLearningPathCourseProgresses
                    .Where(p => p.UserId == userId.Value && pathIds.Contains(p.LearningPathId))
                    .GroupBy(p => p.LearningPathId)
                    .Select(g => new { PathId = g.Key, CompletedCourses = g.Count() })
                    .ToDictionaryAsync(x => x.PathId, x => x.CompletedCourses);

            var sections = course.Sections
                .OrderBy(s => s.Order)
                .Select(s => new
                {
                    id = s.Id,
                    title = s.Title,
                    order = s.Order,
                    lessons = s.Lessons
                        .OrderBy(l => l.Order)
                        .Select(l => new
                        {
                            id = l.Id,
                            title = l.Title,
                            order = l.Order,
                            files = l.Files
                                .OrderBy(f => f.Id)
                                .Select(f => new
                                {
                                    id = f.Id,
                                    name = f.FileName,
                                    url = BuildLessonFileUrl(f.Id),
                                    uploadedAt = f.UploadedAt
                                })
                        })
                });

            var learningPaths =
                (course.LearningPathCourses?
                    .Select(lp => lp.LearningPath)
                    .Where(lp => lp != null)
                    .Distinct()
                    .Select(lp => new
                    {
                        learningPathId = lp.Id,
                        learningPathTitle = lp.Title,
                        totalCourses = totalByPath.TryGetValue(lp.Id, out var total) ? total : 0,
                        completedCourses = completedByPath.TryGetValue(lp.Id, out var completed) ? completed : 0,
                        completionPercent = CalculateCompletionPercent(totalByPath, completedByPath, lp.Id)
                    })
                ) ?? Enumerable.Empty<object>();

            return Ok(new
            {
                id = course.Id,
                title = course.Title,
                description = course.Description,
                price = course.Price,
                hours = course.Hours,
                category = course.Category,
                rating = course.Rating,
                thumbnailUrl = course.ThumbnailUrl,
                purchasedAt = userCourse.PurchasedAt,
                completedAt = userCourse.CompletedAt,
                sections,
                learningPaths
            });
        }


        [HttpPost("my-courses/{courseId}/complete")]
        [Authorize]
        public async Task<IActionResult> CompleteMyCourse(int courseId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var userCourse = await _context.UserCourses
                .Where(uc => uc.UserId == userId.Value && uc.CourseId == courseId)
                .Include(uc => uc.Course)
                    .ThenInclude(c => c.LearningPathCourses)
                        .ThenInclude(lp => lp.LearningPath)
                .FirstOrDefaultAsync();

            if (userCourse == null)
                return NotFound(new { message = "Course not found in your library." });

            var now = DateTime.UtcNow;
            userCourse.CompletedAt = now;

            var pathIds = userCourse.Course.LearningPathCourses?
                .Select(lp => lp.LearningPathId)
                .Distinct()
                .ToList() ?? new List<int>();

            if (pathIds.Count > 0)
            {
                var existingProgress = await _context.UserLearningPathCourseProgresses
                    .Where(p => p.UserId == userId.Value &&
                                p.CourseId == courseId &&
                                pathIds.Contains(p.LearningPathId))
                    .ToListAsync();

                foreach (var pathId in pathIds)
                {
                    if (!existingProgress.Any(p => p.LearningPathId == pathId))
                    {
                        _context.UserLearningPathCourseProgresses.Add(
                            new UserLearningPathCourseProgress
                            {
                                UserId = userId.Value,
                                CourseId = courseId,
                                LearningPathId = pathId,
                                CompletedAt = now
                            });
                    }
                }
            }

            await _context.SaveChangesAsync();

            var totalByPath = pathIds.Count == 0
                ? new Dictionary<int, int>()
                : await _context.LearningPathCourses
                    .Where(lpc => pathIds.Contains(lpc.LearningPathId))
                    .GroupBy(lpc => lpc.LearningPathId)
                    .Select(g => new { PathId = g.Key, TotalCourses = g.Count() })
                    .ToDictionaryAsync(x => x.PathId, x => x.TotalCourses);

            var completedByPath = pathIds.Count == 0
                ? new Dictionary<int, int>()
                : await _context.UserLearningPathCourseProgresses
                    .Where(p => p.UserId == userId.Value && pathIds.Contains(p.LearningPathId))
                    .GroupBy(p => p.LearningPathId)
                    .Select(g => new { PathId = g.Key, CompletedCourses = g.Count() })
                    .ToDictionaryAsync(x => x.PathId, x => x.CompletedCourses);

            var pathStatuses =
                (userCourse.Course.LearningPathCourses?
                    .Select(lp => lp.LearningPath)
                    .Where(lp => lp != null)
                    .Distinct()
                    .Select(lp => new
                    {
                        learningPathId = lp.Id,
                        learningPathTitle = lp.Title,
                        totalCourses = totalByPath.TryGetValue(lp.Id, out var total) ? total : 0,
                        completedCourses = completedByPath.TryGetValue(lp.Id, out var completed) ? completed : 0,
                        completionPercent = CalculateCompletionPercent(totalByPath, completedByPath, lp.Id)
                    })
                ) ?? Enumerable.Empty<object>();

            return Ok(new
            {
                message = "Course marked as completed.",
                completedAt = userCourse.CompletedAt,
                learningPaths = pathStatuses
            });
        }



        // ============================
        //         My Books
        // ============================
        [HttpGet("my-books")]
        [Authorize]
        public async Task<IActionResult> GetMyBooks()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var userBooks = await _context.UserBooks
                .Where(ub => ub.UserId == userId.Value)
                .Include(ub => ub.Book)
                .ThenInclude(b => b.Files)
                .ToListAsync();

            var books = userBooks.Select(ub =>
            {
            var primaryFileId = ub.Book.Files
                .OrderBy(f => f.Id)
                .Select(f => f.Id)
                .FirstOrDefault();

            return new
            {
                    ub.Book.Id,
                    ub.Book.Title,
                    ub.Book.Description,
                    ub.Book.Price,
                    ub.Book.Category,
                    ub.Book.ThumbnailUrl,
                fileUrl = primaryFileId > 0 ? BuildBookFileUrl(primaryFileId) : string.Empty,
                ub.GrantedAt,
                    ub.IsFromCourse
            };
            }).ToList();

            return Ok(books);
        }



        // ============================
        //          Public Tools
        // ============================
        [HttpGet("tools")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTools()
        {
            var tools = await _context.Tools
                .Where(t => t.IsActive)
                .OrderBy(t => t.DisplayOrder)
                .ThenBy(t => t.Name)
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    t.Description,
                    t.Url,
                    t.Category,
                    t.DisplayOrder
                })
                .ToListAsync();

            return Ok(tools);
        }

        // ============================
        //       Learning Paths
        // ============================
        [HttpGet("paths")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLearningPaths()
        {
            var paths = await _context.LearningPaths
                .Where(p => p.IsActive)
                .Include(p => p.LearningPathCourses)
              .OrderBy(p => p.Title)
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Description,
                    CoursesCount = p.LearningPathCourses.Count
                })
                .ToListAsync();

            return Ok(paths);
        }

        // ============================
        //         Utilities
        // ============================

        private string BuildLessonFileUrl(int fileId)
        {
            return Url.Content($"/api/lessons/files/{fileId}");
        }


        private string BuildBookFileUrl(int fileId)
        {
            return Url.Content($"/api/books/files/{fileId}");
        }
        private double CalculateCompletionPercent(
            IDictionary<int, int> totalByPath,
            IDictionary<int, int> completedByPath,
            int pathId)
        {
            if (!totalByPath.TryGetValue(pathId, out var totalCourses) || totalCourses == 0)
                return 0;

            completedByPath.TryGetValue(pathId, out var completedCourses);
            var percent = (double)completedCourses / totalCourses * 100;

            return Math.Min(100, Math.Round(percent, 2));
        }



        // ============================
        //         Helper
        // ============================
        private int? GetCurrentUserId()
        {
            var userIdClaim = User.Claims.FirstOrDefault(c =>
                c.Type == "Id" ||
                c.Type == "id" ||
                c.Type == ClaimTypes.NameIdentifier ||
                c.Type == "UserId" ||
                c.Type == "userId" ||
                c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub
            );

            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var userId))
                return userId;

            return null;
        }
    }
}
