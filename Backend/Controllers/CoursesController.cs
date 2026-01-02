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
                  .Select(c => new
                  {
                      c.Id,
                      c.Title,
                      c.Description,
                      c.ThumbnailUrl,
                      c.Price,
                      c.Discount,
                      c.Hours,
                      c.Category,
                      c.Rating,
                      pathTitle = c.LearningPathCourses
                        .Select(lp => lp.LearningPath.Title)
                        .FirstOrDefault()
                  })
                .ToListAsync();

            var ratingStats = await _context.CourseRatings
               .GroupBy(r => r.CourseId)
               .Select(g => new
               {
                   CourseId = g.Key,
                   Count = g.Count(),
                   Average = Math.Round(g.Average(x => x.Rating), 2)
               })
               .ToDictionaryAsync(x => x.CourseId, x => x);

            var result = courses.Select(c => new
            {
                c.Id,
                c.Title,
                c.Description,
                c.ThumbnailUrl,
                c.Price,
                c.Discount,
                finalPrice = Backend.Helpers.PricingHelper.CalculateDiscountedPrice(c.Price, c.Discount),
                c.Hours,
                c.Category,
                rating = ratingStats.TryGetValue(c.Id, out var stats) ? stats.Average : c.Rating,
                ratingCount = ratingStats.TryGetValue(c.Id, out var stats2) ? stats2.Count : 0,
                c.pathTitle
            });

            return Ok(result);
        }

        [HttpGet("featured")]
        [AllowAnonymous]
        public async Task<IActionResult> GetFeaturedCourses()
        {
            var courses = await BuildCoursesQuery()
                         
                         
                .Select(c => new
                {
                    c.Id,
                    c.Title,
                    c.Description,
                    c.ThumbnailUrl,
                    c.Price,
                    c.Discount,
                    c.Hours,
                    c.Category,
                    c.Rating,
                    pathTitle = c.LearningPathCourses
                        .Select(lp => lp.LearningPath.Title)
                        .FirstOrDefault()
                })
                .ToListAsync();

            var ratingStats = await _context.CourseRatings
              .GroupBy(r => r.CourseId)
              .Select(g => new
              {
                  CourseId = g.Key,
                  Count = g.Count(),
                  Average = Math.Round(g.Average(x => x.Rating), 2)
              })
              .ToDictionaryAsync(x => x.CourseId, x => x);

            var result = courses.Select(c => new
            {
                c.Id,
                c.Title,
                c.Description,
                c.ThumbnailUrl,
                c.Price,
                c.Discount,
                finalPrice = Backend.Helpers.PricingHelper.CalculateDiscountedPrice(c.Price, c.Discount),
                c.Hours,
                c.Category,
                rating = ratingStats.TryGetValue(c.Id, out var stats) ? stats.Average : c.Rating,
                ratingCount = ratingStats.TryGetValue(c.Id, out var stats2) ? stats2.Count : 0,
                c.pathTitle
            });

            return Ok(result);
        }

        private IQueryable<Backend.Models.Course> BuildCoursesQuery()
        {
            return _context.Courses
                .AsNoTracking()
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.CreatedAt);
        }
    }
}