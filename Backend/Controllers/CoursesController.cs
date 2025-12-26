using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/courses")]
    public class CoursesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CoursesController(AppDbContext context)
        {
            _context = context;
        }


        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetCourses()
        {
            var courses = await BuildCoursesQuery()
                .ToListAsync();

            return Ok(courses);
        }

        [HttpGet("featured")]
        [AllowAnonymous]
        public async Task<IActionResult> GetFeaturedCourses()
        {
            var courses = await BuildCoursesQuery()
                         
                          .ToListAsync();

            return Ok(courses);
        }

        private IQueryable<object> BuildCoursesQuery()
        {
            return _context.Courses
                .AsNoTracking()
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.CreatedAt)
            
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
                });
        }
    }
}