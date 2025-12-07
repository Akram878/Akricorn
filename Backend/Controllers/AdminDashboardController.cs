using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/admin/dashboard")]
    [Authorize(Policy = "AdminOnly")]
    public class AdminDashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminDashboardController(AppDbContext context)
        {
            _context = context;
        }

        // GET: /api/admin/dashboard/summary
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            // أرقام بسيطة كفكرة أولى - نقدر نطوّرها لاحقاً
            var usersCount = await _context.Users.CountAsync();
            var coursesCount = await _context.Courses.CountAsync();
            var booksCount = await _context.Books.CountAsync();

            return Ok(new
            {
                usersCount,
                coursesCount,
                booksCount
            });
        }
    }
}
