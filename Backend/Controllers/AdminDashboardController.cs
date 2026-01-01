using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/admin/dashboard")]
    [Authorize(Policy = "AdminOnly")]
    public class AdminDashboardController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AdminDashboardController> _logger;

        public AdminDashboardController(AppDbContext context, ILogger<AdminDashboardController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: /api/admin/dashboard/summary
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            try
            {
                var totalUsers = await _context.Users.CountAsync();
                var activeUsers = await _context.Users.CountAsync(user => user.IsActive);
                var courses = await _context.Courses.CountAsync();
                var books = await _context.Books.CountAsync();
                var learningPaths = await _context.LearningPaths.CountAsync();
                var tools = await _context.Tools.CountAsync();

                return Ok(new
                {
                    totalUsers,
                    activeUsers,
                    courses,
                    books,
                    learningPaths,
                    tools
                });
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "Database connection failed while fetching dashboard summary");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Database connection failed. Please verify the connection string and that the database is reachable."
                });
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Database update error while fetching dashboard summary");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Database schema is out of date. Apply the latest migrations and try again."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching dashboard summary");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "An unexpected server error occurred while loading the dashboard. Please try again later."
                });
            }
        }
    }
}
