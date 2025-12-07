using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/admin/courses")]
    [Authorize(Policy = "AdminOnly")]
    public class AdminCoursesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminCoursesController(AppDbContext context)
        {
            _context = context;
        }

        // ============================
        //   GET ALL COURSES
        // ============================
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var courses = await _context.Courses
                .Include(c => c.CourseBooks)
                .Include(c => c.LearningPathCourses)
                .ToListAsync();

            var result = courses.Select(c => new CourseDto
            {
                Id = c.Id,
                Title = c.Title,
                Description = c.Description,
                Price = c.Price,
                IsActive = c.IsActive,
                Hours = c.Hours,
                Category = c.Category,
                Rating = c.Rating,
                BookIds = c.CourseBooks.Select(cb => cb.BookId).ToList(),
                PathIds = c.LearningPathCourses.Select(lp => lp.LearningPathId).ToList()
            });

            return Ok(result);
        }

        // ============================
        //   GET COURSE BY ID
        // ============================
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var c = await _context.Courses
                .Include(c => c.CourseBooks)
                .Include(c => c.LearningPathCourses)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (c == null)
                return NotFound(new { message = "Course not found." });

            var result = new CourseDto
            {
                Id = c.Id,
                Title = c.Title,
                Description = c.Description,
                Price = c.Price,
                IsActive = c.IsActive,
                Hours = c.Hours,
                Category = c.Category,
                Rating = c.Rating,
                BookIds = c.CourseBooks.Select(cb => cb.BookId).ToList(),
                PathIds = c.LearningPathCourses.Select(lp => lp.LearningPathId).ToList()
            };

            return Ok(result);
        }

        // ============================
        //   CREATE COURSE
        // ============================
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CourseCreateRequest request)
        {
            var c = new Course
            {
                Title = request.Title,
                Description = request.Description,
                Price = request.Price,
                IsActive = request.IsActive,
                Hours = request.Hours,
                Category = request.Category,
                Rating = request.Rating
            };

            _context.Courses.Add(c);
            await _context.SaveChangesAsync();

            // Books
            if (request.BookIds != null)
            {
                foreach (var bookId in request.BookIds)
                {
                    _context.CourseBooks.Add(new CourseBook
                    {
                        CourseId = c.Id,
                        BookId = bookId
                    });
                }
            }

            // Paths
            if (request.PathIds != null)
            {
                foreach (var pathId in request.PathIds)
                {
                    _context.LearningPathCourses.Add(new LearningPathCourse
                    {
                        CourseId = c.Id,
                        LearningPathId = pathId,
                        StepOrder = 1
                    });
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Course created successfully." });
        }

        // ============================
        //   UPDATE COURSE
        // ============================
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CourseUpdateRequest request)
        {
            var c = await _context.Courses
                .Include(c => c.CourseBooks)
                .Include(c => c.LearningPathCourses)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (c == null)
                return NotFound(new { message = "Course not found." });

            c.Title = request.Title;
            c.Description = request.Description;
            c.Price = request.Price;
            c.IsActive = request.IsActive;
            c.Hours = request.Hours;
            c.Category = request.Category;
            c.Rating = request.Rating;

            // update books
            _context.CourseBooks.RemoveRange(c.CourseBooks);
            if (request.BookIds != null)
            {
                foreach (var bookId in request.BookIds)
                {
                    _context.CourseBooks.Add(new CourseBook
                    {
                        CourseId = c.Id,
                        BookId = bookId
                    });
                }
            }

            // update paths
            _context.LearningPathCourses.RemoveRange(c.LearningPathCourses);
            if (request.PathIds != null)
            {
                foreach (var pathId in request.PathIds)
                {
                    _context.LearningPathCourses.Add(new LearningPathCourse
                    {
                        CourseId = c.Id,
                        LearningPathId = pathId,
                        StepOrder = 1
                    });
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Course updated successfully." });
        }

        // ============================
        //   DELETE COURSE
        // ============================
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var c = await _context.Courses
                .Include(c => c.CourseBooks)
                .Include(c => c.LearningPathCourses)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (c == null)
                return NotFound(new { message = "Course not found." });

            _context.CourseBooks.RemoveRange(c.CourseBooks);
            _context.LearningPathCourses.RemoveRange(c.LearningPathCourses);
            _context.Courses.Remove(c);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Course deleted successfully." });
        }
    }

    // ============================
    //   DTO + REQUEST MODELS
    // ============================
    public class CourseDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public bool IsActive { get; set; }

        public int Hours { get; set; }
        public string Category { get; set; }
        public double Rating { get; set; }

        public List<int> BookIds { get; set; }
        public List<int> PathIds { get; set; }
    }

    public class CourseCreateRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public bool IsActive { get; set; }

        public int Hours { get; set; }
        public string Category { get; set; }
        public double Rating { get; set; }

        public List<int> BookIds { get; set; }
        public List<int> PathIds { get; set; }
    }

    public class CourseUpdateRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public bool IsActive { get; set; }

        public int Hours { get; set; }
        public string Category { get; set; }
        public double Rating { get; set; }

        public List<int> BookIds { get; set; }
        public List<int> PathIds { get; set; }
    }
}
