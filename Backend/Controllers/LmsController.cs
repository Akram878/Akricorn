using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Security.Claims;

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

        // 🔐 Helper موحّد لجلب الـ userId من الـ JWT
        private int? GetCurrentUserId()
        {
            var userIdClaim = User.Claims.FirstOrDefault(c =>
                c.Type == "Id" ||
                c.Type == "id" ||
                c.Type == ClaimTypes.NameIdentifier ||   // "nameid"
                c.Type == "UserId" ||
                c.Type == "userId"
            );

            if (userIdClaim == null)
                return null;

            if (int.TryParse(userIdClaim.Value, out var userId))
                return userId;

            return null;
        }

        // ============================
        //     Public Courses
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
        //     Library Books
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
                    b.FileUrl
                })
                .ToListAsync();

            return Ok(books);
        }

        // ============================
        //     Purchase Course
        // ============================
        [HttpPost("courses/{courseId}/purchase")]
        [Authorize]
        public async Task<IActionResult> PurchaseCourse(int courseId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Invalid token." });

            try
            {
                // تأكد أن الكورس موجود
                var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
                if (course == null)
                    return NotFound(new { message = "Course not found." });

                // تأكد أن المستخدم لا يملك الكورس مسبقاً
                var courseAlreadyOwned = await _context.UserCourses
                    .AnyAsync(uc => uc.UserId == userId.Value && uc.CourseId == courseId);

                if (courseAlreadyOwned)
                    return BadRequest(new { message = "You already own this course." });

                // أضف سجل UserCourse
                var userCourse = new UserCourse
                {
                    CourseId = courseId,
                    UserId = userId.Value,
                    PurchasedAt = DateTime.UtcNow
                };

                _context.UserCourses.Add(userCourse);

                // أضف الكتب المرتبطة بالكورس إلى مكتبة المستخدم
                var courseBooks = await _context.CourseBooks
                    .Where(cb => cb.CourseId == courseId)
                    .ToListAsync();

                if (courseBooks.Any())
                {
                    var courseBookIds = courseBooks.Select(cb => cb.BookId).ToList();

                    // الكتب التي يملكها المستخدم أصلاً
                    var existingUserBookIds = await _context.UserBooks
                        .Where(ub => ub.UserId == userId.Value && courseBookIds.Contains(ub.BookId))
                        .Select(ub => ub.BookId)
                        .ToListAsync();

                    // الكتب التي سنضيفها فقط (غير الموجودة)
                    var booksToAdd = courseBookIds
                        .Where(bookId => !existingUserBookIds.Contains(bookId))
                        .Distinct()
                        .ToList();

                    foreach (var bookId in booksToAdd)
                    {
                        _context.UserBooks.Add(new UserBook
                        {
                            UserId = userId.Value,
                            BookId = bookId
                        });
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Course purchased successfully." });
            }
            catch (DbUpdateException)
            {
                // لو فيه أي مشكلة في الـ constraints (مثلاً حاول يضيف duplicate)
                return BadRequest(new { message = "You already own this course or its books." });
            }
            catch (Exception)
            {
                // fallback لأي خطأ غير متوقع
                return StatusCode(500, new { message = "An error occurred while purchasing the course." });
            }
        }

        // ============================
        //     My Courses
        // ============================
        [HttpGet("my-courses")]
        [Authorize]
        public async Task<IActionResult> GetMyCourses()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Invalid token." });

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
        //     My Books
        // ============================
        [HttpGet("my-books")]
        [Authorize]
        public async Task<IActionResult> GetMyBooks()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var books = await _context.UserBooks
                .Where(ub => ub.UserId == userId.Value)
                .Include(ub => ub.Book)
                .Select(ub => new
                {
                    ub.Book.Id,
                    ub.Book.Title,
                    ub.Book.Description,
                    ub.Book.Price,
                    ub.Book.FileUrl
                })
                .ToListAsync();

            return Ok(books);
        }
    }
}
