using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

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
                    c.Price
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
                                    fileUrl = f.FileUrl,
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
                return Unauthorized(new { message = "Invalid token." });

            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                    return Unauthorized(new { message = "User not found." });

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
                return Unauthorized(new { message = "Invalid token." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "User not found." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var myCourses = await _context.UserCourses
                .Where(uc => uc.UserId == userId.Value)
                .Include(uc => uc.Course)
                .Select(uc => new
                {
                    uc.Course.Id,
                    uc.Course.Title,
                    uc.Course.Description,
                    uc.Course.Price,
                    uc.PurchasedAt
                })
                .ToListAsync();

            return Ok(myCourses);
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
                return Unauthorized(new { message = "Invalid token." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "User not found." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var books = await _context.UserBooks
                .Where(ub => ub.UserId == userId.Value)
                .Include(ub => ub.Book)
                .Select(ub => new
                {
                    ub.Book.Id,
                    ub.Book.Title,
                    ub.Book.Description,
                    ub.Book.Price,
                    ub.Book.Category,
                    ub.Book.ThumbnailUrl,
                    ub.Book.FileUrl,
                    ub.GrantedAt,
                    ub.IsFromCourse
                })
                .ToListAsync();

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
                .OrderBy(p => p.DisplayOrder)
                .ThenBy(p => p.Title)
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Description,
                    CoursesCount = p.LearningPathCourses.Count,
                    p.DisplayOrder
                })
                .ToListAsync();

            return Ok(paths);
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
