using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System;
using System.IO;
using Backend.Helpers;

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

        // ============================================================ 
        // GET ALL COURSES 
        // ============================================================ 
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CourseDto>>> GetAll()
        {
            var result = await _context.Courses
                .Include(c => c.LearningPathCourses)
                .Select(c => new CourseDto
                {
                    Id = c.Id,
                    Title = c.Title,
                    Description = c.Description,
                    Price = c.Price,
                    IsActive = c.IsActive,
                    Hours = c.Hours,
                    Category = c.Category,
                    Rating = c.Rating,
                    ThumbnailUrl = c.ThumbnailUrl,
                    PathIds = c.LearningPathCourses
                        .Select(lp => lp.LearningPathId)
                        .ToList()
                })
                .ToListAsync();

            return Ok(result);
        }

        // ============================================================ 
        // GET COURSE BY ID 
        // ============================================================ 
        [HttpGet("{id}")]
        public async Task<ActionResult<CourseDto>> GetById(int id)
        {
            var course = await _context.Courses
                .Include(c => c.LearningPathCourses)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (course == null)
                return NotFound(new { message = "Course not found." });

            var dto = new CourseDto
            {
                Id = course.Id,
                Title = course.Title,
                Description = course.Description,
                Price = course.Price,
                IsActive = course.IsActive,
                Hours = course.Hours,
                Category = course.Category,
                Rating = course.Rating,
                ThumbnailUrl = course.ThumbnailUrl,
                PathIds = course.LearningPathCourses
                    .Select(lp => lp.LearningPathId)
                    .ToList()
            };

            return Ok(dto);
        }

        // ============================================================ 
        // CREATE COURSE 
        // ============================================================ 
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCourseRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var course = new Course
                {
                    Title = request.Title,
                    Description = request.Description,
                    Price = request.Price,
                    IsActive = request.IsActive,
                    Hours = request.Hours,
                    Category = request.Category,
                    Rating = request.Rating,
                    ThumbnailUrl = request.ThumbnailUrl
                };

                _context.Courses.Add(course);
                await _context.SaveChangesAsync();

                EnsureCourseDirectories(course.Id);

                // Save Learning Paths 
                var pathIds = (request.PathIds ?? new List<int>())
                    .Distinct()
                    .ToList();

                if (pathIds.Count > 0)
                {
                    var validPaths = await _context.LearningPaths
                        .Where(lp => pathIds.Contains(lp.Id))
                        .Select(lp => lp.Id)
                        .ToListAsync();

                    var order = 0;

                    foreach (var pathId in validPaths)
                    {
                        _context.LearningPathCourses.Add(new LearningPathCourse
                        {
                            CourseId = course.Id,
                            LearningPathId = pathId,
                            StepOrder = order++
                        });
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Course created successfully.", id = course.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = $"Error while creating course: {ex.Message}",
                    inner = ex.InnerException?.Message
                });
            }
        }

        // ============================================================ 
        // UPDATE COURSE 
        // ============================================================ 
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateCourseRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var course = await _context.Courses
                .Include(c => c.LearningPathCourses)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (course == null)
                return NotFound(new { message = "Course not found." });

            try
            {
                // Update basic fields 
                course.Title = request.Title;
                course.Description = request.Description;
                course.Price = request.Price;
                course.IsActive = request.IsActive;
                course.Hours = request.Hours;
                course.Category = request.Category;
                course.Rating = request.Rating;
                course.ThumbnailUrl = request.ThumbnailUrl;

                // Update Learning Paths 
                var oldLinks = _context.LearningPathCourses
                    .Where(lp => lp.CourseId == id);
                _context.LearningPathCourses.RemoveRange(oldLinks);

                var pathIds = (request.PathIds ?? new List<int>())
                    .Distinct()
                    .ToList();

                if (pathIds.Count > 0)
                {
                    var validPaths = await _context.LearningPaths
                        .Where(lp => pathIds.Contains(lp.Id))
                        .Select(lp => lp.Id)
                        .ToListAsync();

                    var order = 0;

                    foreach (var pathId in validPaths)
                    {
                        _context.LearningPathCourses.Add(new LearningPathCourse
                        {
                            CourseId = id,
                            LearningPathId = pathId,
                            StepOrder = order++
                        });
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Course updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = $"Error while updating course: {ex.Message}",
                    inner = ex.InnerException?.Message
                });
            }
        }

        // ============================================================ 
        // DELETE COURSE 
        // ============================================================ 
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var course = await _context.Courses.FindAsync(id);
            if (course == null)
                return NotFound(new { message = "Course not found." });

            try
            {
                var courseFolder = CourseStorageHelper.GetCourseFolder(id);
                if (Directory.Exists(courseFolder))
                    Directory.Delete(courseFolder, true);
                var publicFolder = Path.Combine(CourseStorageHelper.GetLegacyCourseRootFolder(), $"course-{id}");
                if (Directory.Exists(publicFolder))
                    Directory.Delete(publicFolder, true);

                // Remove learning path links
                var links = _context.LearningPathCourses
                    .Where(lp => lp.CourseId == id);
                _context.LearningPathCourses.RemoveRange(links);

                _context.Courses.Remove(course);

                await _context.SaveChangesAsync();

                return Ok(new { message = "Course deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = $"Error while deleting course: {ex.Message}",
                    inner = ex.InnerException?.Message
                });
            }
        }


        // ============================================================
        // TOGGLE COURSE ACTIVE STATUS
        // ============================================================
        [HttpPatch("{id:int}/toggle")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == id);

            if (course == null)
                return NotFound(new { message = "Course not found." });

            course.IsActive = !course.IsActive;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Course status changed.", isActive = course.IsActive });
        }


        // ============================================================
        // UPLOAD THUMBNAIL
        // ============================================================
        [HttpPost("{courseId}/upload-thumbnail")]
        [DisableRequestSizeLimit]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadThumbnail(int courseId, IFormFile file)
        {
            var course = await _context.Courses.FindAsync(courseId);
            if (course == null)
                return NotFound(new { message = "Course not found." });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded." });

            var folder = CourseStorageHelper.GetThumbnailFolder(courseId);
            Directory.CreateDirectory(folder);

            foreach (var existing in Directory.GetFiles(folder))
                System.IO.File.Delete(existing);

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var path = Path.Combine(folder, fileName);

            using (var stream = new FileStream(path, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativePath = Path.Combine("courses", $"course-{courseId}", "thumbnail", fileName)
               .Replace("\\", "/");

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var url = $"{baseUrl}/{relativePath}";

            course.ThumbnailUrl = url;
            await _context.SaveChangesAsync();

            return Ok(new { url });
        }


        // ============================================================ 
        // DTO + REQUEST MODELS 
        // ============================================================ 
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
            public string ThumbnailUrl { get; set; }
            public List<int> PathIds { get; set; } = new();
        }

        public class CreateCourseRequest
        {
            public string Title { get; set; }
            public string Description { get; set; }
            public decimal Price { get; set; }
            public bool IsActive { get; set; } = true;
            public int Hours { get; set; }
            public string Category { get; set; }
            public double Rating { get; set; }
            public string ThumbnailUrl { get; set; }
            public List<int> PathIds { get; set; } = new();
        }

        public class UpdateCourseRequest
        {
            public string Title { get; set; }
            public string Description { get; set; }
            public decimal Price { get; set; }
            public bool IsActive { get; set; } = true;
            public int Hours { get; set; }
            public string Category { get; set; }
            public double Rating { get; set; }
            public string ThumbnailUrl { get; set; }
            public List<int> PathIds { get; set; } = new();
        }

        private void EnsureCourseDirectories(int courseId)
        {
            var thumbnailFolder = CourseStorageHelper.GetThumbnailFolder(courseId);
            var contentFolder = CourseStorageHelper.GetContentFolder(courseId);

            Directory.CreateDirectory(thumbnailFolder);
            Directory.CreateDirectory(contentFolder);
        }
    }
}
