using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/admin/paths")]
    [Authorize(Policy = "AdminOnly")]
    public class AdminLearningPathsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminLearningPathsController(AppDbContext context)
        {
            _context = context;
        }

        // =========================
        // GET: /api/admin/paths
        // عرض كل المسارات
        // =========================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<LearningPathDto>>> GetAll()
        {
            var paths = await _context.LearningPaths
                .Include(lp => lp.LearningPathCourses)
                .ToListAsync();

            var result = paths.Select(lp => new LearningPathDto
            {
                Id = lp.Id,
                Title = lp.Title,
                Description = lp.Description,
                IsActive = lp.IsActive,
                DisplayOrder = lp.DisplayOrder,
                CourseIds = lp.LearningPathCourses?
                    .OrderBy(pc => pc.StepOrder)
                    .Select(pc => pc.CourseId)
                    .ToList() ?? new List<int>()
            }).ToList();

            return Ok(result);
        }

        // =========================
        // GET: /api/admin/paths/{id}
        // مسار واحد بالتفصيل
        // =========================
        [HttpGet("{id:int}")]
        public async Task<ActionResult<LearningPathDto>> GetById(int id)
        {
            var path = await _context.LearningPaths
                .Include(lp => lp.LearningPathCourses)
                .FirstOrDefaultAsync(lp => lp.Id == id);

            if (path == null)
                return NotFound(new { message = "Learning path not found." });

            var dto = new LearningPathDto
            {
                Id = path.Id,
                Title = path.Title,
                Description = path.Description,
                IsActive = path.IsActive,
                DisplayOrder = path.DisplayOrder,
                CourseIds = path.LearningPathCourses?
                    .OrderBy(pc => pc.StepOrder)
                    .Select(pc => pc.CourseId)
                    .ToList() ?? new List<int>()
            };

            return Ok(dto);
        }

        // =========================
        // POST: /api/admin/paths
        // إنشاء مسار جديد
        // =========================
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateLearningPathRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new { message = "Title is required." });

            var path = new LearningPath
            {
                Title = request.Title,
                Description = request.Description,
                IsActive = request.IsActive,
                DisplayOrder = request.DisplayOrder
            };

            _context.LearningPaths.Add(path);
            await _context.SaveChangesAsync();

            // ربط الكورسات لو انوجدت
            if (request.CourseIds != null && request.CourseIds.Any())
            {
                var validCourseIds = await _context.Courses
                    .Where(c => request.CourseIds.Contains(c.Id))
                    .Select(c => c.Id)
                    .ToListAsync();

                var pathCourses = validCourseIds.Select((courseId, index) => new LearningPathCourse
                {
                    LearningPathId = path.Id,
                    CourseId = courseId,
                    StepOrder = index
                });

                _context.LearningPathCourses.AddRange(pathCourses);
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Learning path created successfully.", pathId = path.Id });
        }

        // =========================
        // PUT: /api/admin/paths/{id}
        // تعديل مسار موجود
        // =========================
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateLearningPathRequest request)
        {
            var path = await _context.LearningPaths
                .Include(lp => lp.LearningPathCourses)
                .FirstOrDefaultAsync(lp => lp.Id == id);

            if (path == null)
                return NotFound(new { message = "Learning path not found." });

            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new { message = "Title is required." });

            path.Title = request.Title;
            path.Description = request.Description;
            path.IsActive = request.IsActive;
            path.DisplayOrder = request.DisplayOrder;

            // حذف الربط القديم
            if (path.LearningPathCourses != null && path.LearningPathCourses.Any())
            {
                _context.LearningPathCourses.RemoveRange(path.LearningPathCourses);
            }

            // إضافة الربط الجديد
            if (request.CourseIds != null && request.CourseIds.Any())
            {
                var validCourseIds = await _context.Courses
                    .Where(c => request.CourseIds.Contains(c.Id))
                    .Select(c => c.Id)
                    .ToListAsync();

                var pathCourses = validCourseIds.Select((courseId, index) => new LearningPathCourse
                {
                    LearningPathId = path.Id,
                    CourseId = courseId,
                    StepOrder = index
                });

                _context.LearningPathCourses.AddRange(pathCourses);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Learning path updated successfully." });
        }

        // =========================
        // DELETE: /api/admin/paths/{id}
        // حذف مسار
        // =========================
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var path = await _context.LearningPaths
                .Include(lp => lp.LearningPathCourses)
                .FirstOrDefaultAsync(lp => lp.Id == id);

            if (path == null)
                return NotFound(new { message = "Learning path not found." });

            if (path.LearningPathCourses != null && path.LearningPathCourses.Any())
            {
                _context.LearningPathCourses.RemoveRange(path.LearningPathCourses);
            }

            _context.LearningPaths.Remove(path);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Learning path deleted successfully." });
        }

        // =========================
        // PATCH: /api/admin/paths/{id}/toggle
        // تفعيل/تعطيل مسار
        // =========================
        [HttpPatch("{id:int}/toggle")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var path = await _context.LearningPaths.FirstOrDefaultAsync(lp => lp.Id == id);

            if (path == null)
                return NotFound(new { message = "Learning path not found." });

            path.IsActive = !path.IsActive;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Learning path status changed.", isActive = path.IsActive });
        }
    }

    // ==========================
    //   DTOs لمسارات التعلم
    // ==========================

    public class LearningPathDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public bool IsActive { get; set; }
        public int DisplayOrder { get; set; }
        public List<int> CourseIds { get; set; } = new();
    }

    public class CreateLearningPathRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; } = 0;
        public List<int> CourseIds { get; set; } = new();
    }

    public class UpdateLearningPathRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; } = 0;
        public List<int> CourseIds { get; set; } = new();
    }
}
