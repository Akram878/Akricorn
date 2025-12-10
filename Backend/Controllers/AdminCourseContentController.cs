using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
namespace Backend.Controllers;
using Backend.Helpers;
using System;
using System.IO;
using System.Linq;

[ApiController]
[Route("api/admin/course-content")]
[Authorize(Policy = "AdminOnly")]
public class AdminCourseContentController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminCourseContentController(AppDbContext context)
    {
        _context = context;
    }

    // ============================================================
    // GET COURSE CONTENT
    // ============================================================
    [HttpGet("{courseId}")]
    public async Task<IActionResult> GetCourseContent(int courseId)
    {
        var course = await _context.Courses
            .Include(c => c.Sections)
                .ThenInclude(s => s.Lessons)
                    .ThenInclude(l => l.Files)
            .FirstOrDefaultAsync(c => c.Id == courseId);

        if (course == null)
            return NotFound(new { message = "Course not found." });

        var result = new
        {
            courseId = course.Id,
            sections = course.Sections
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
                            files = l.Files.Select(f => new
                            {
                                id = f.Id,
                                fileName = f.FileName,
                                fileUrl = f.FileUrl
                            })
                        })
                })
        };

        return Ok(result);
    }

    // ============================================================
    // CREATE SECTION
    // ============================================================
    [HttpPost("{courseId}/sections")]
    public async Task<IActionResult> CreateSection(int courseId, [FromBody] CreateSectionRequest request)
    {
        if (!await _context.Courses.AnyAsync(c => c.Id == courseId))
            return NotFound(new { message = "Course not found." });

        var section = new CourseSection
        {
            CourseId = courseId,
            Title = request.Title,
            Order = request.Order
        };

        _context.CourseSections.Add(section);
        await _context.SaveChangesAsync();
        var sectionFolder = CourseStorageHelper.GetSectionFolder(courseId, section.Id);
        Directory.CreateDirectory(sectionFolder);
        return Ok(new { message = "Section created.", id = section.Id });
    }

    // ============================================================
    // UPDATE SECTION
    // ============================================================
    [HttpPut("sections/{sectionId}")]
    public async Task<IActionResult> UpdateSection(int sectionId, [FromBody] UpdateSectionRequest request)
    {
        var section = await _context.CourseSections.FindAsync(sectionId);
        if (section == null)
            return NotFound(new { message = "Section not found." });

        section.Title = request.Title;
        section.Order = request.Order;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Section updated." });
    }

    // ============================================================
    // DELETE SECTION
    // ============================================================
    [HttpDelete("sections/{sectionId}")]
    public async Task<IActionResult> DeleteSection(int sectionId)
    {
        var section = await _context.CourseSections
               .Include(s => s.Course)
               .FirstOrDefaultAsync(s => s.Id == sectionId);
        if (section == null)
            return NotFound(new { message = "Section not found." });
        var sectionFolder = CourseStorageHelper.GetSectionFolder(section.CourseId, section.Id);
        if (Directory.Exists(sectionFolder))
            Directory.Delete(sectionFolder, true);
        _context.CourseSections.Remove(section);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Section deleted." });
    }

    // ============================================================
    // CREATE LESSON
    // ============================================================
    [HttpPost("sections/{sectionId}/lessons")]
    public async Task<IActionResult> CreateLesson(int sectionId, [FromBody] CreateLessonRequest request)
    {
        var section = await _context.CourseSections.FirstOrDefaultAsync(s => s.Id == sectionId);
        if (section == null)
            return NotFound(new { message = "Section not found." });

        var lesson = new CourseLesson
        {
            SectionId = sectionId,
            Title = request.Title,
            Order = request.Order
        };

        _context.CourseLessons.Add(lesson);

        await _context.SaveChangesAsync();
        var lessonFolder = CourseStorageHelper.GetLessonFolder(section.CourseId, sectionId, lesson.Id);
        Directory.CreateDirectory(lessonFolder);
        return Ok(new { message = "Lesson created.", id = lesson.Id });
    }

    // ============================================================
    // DELETE LESSON
    // ============================================================
    [HttpDelete("lessons/{lessonId}")]
    public async Task<IActionResult> DeleteLesson(int lessonId)
    {
        var lesson = await _context.CourseLessons
                .Include(l => l.Section)
                .FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson == null)
            return NotFound(new { message = "Lesson not found." });

        var lessonFolder = CourseStorageHelper.GetLessonFolder(lesson.Section.CourseId, lesson.SectionId, lesson.Id);
        if (Directory.Exists(lessonFolder))
            Directory.Delete(lessonFolder, true);
        _context.CourseLessons.Remove(lesson);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Lesson deleted." });
    }

    // ============================================================
    // UPLOAD FILE (FINAL FIXED VERSION)
    // ============================================================
    [HttpPost("lessons/{lessonId}/upload")]
    [DisableRequestSizeLimit]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadLessonFile(int lessonId, IFormFile file)


    {
        try
        {
            var lesson = await _context.CourseLessons
                     .Include(l => l.Section)
                     .FirstOrDefaultAsync(l => l.Id == lessonId);
            if (lesson == null)
                return NotFound(new { message = "Lesson not found." });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded." });
            var folder = CourseStorageHelper.GetLessonFolder(lesson.Section.CourseId, lesson.SectionId, lesson.Id);
            Directory.CreateDirectory(folder);

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var path = Path.Combine(folder, fileName);

            using (var stream = new FileStream(path, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativePath = Path.Combine("courses", $"course-{lesson.Section.CourseId}", "content", $"section-{lesson.SectionId}", $"lesson-{lesson.Id}", fileName)
                 .Replace("\\", "/");
            var url = $"{Request.Scheme}://{Request.Host}/{relativePath}";

            var newFile = new CourseLessonFile
            {
                LessonId = lessonId,
                FileName = file.FileName,
                FileUrl = url,
                SizeBytes = file.Length,
                ContentType = file.ContentType ?? "application/octet-stream"
            };

            _context.CourseLessonFiles.Add(newFile);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "File uploaded.",
                id = newFile.Id,
                url
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Server error", error = ex.Message });
        }
    }


    // ============================================================
    // DELETE FILE
    // ============================================================
    [HttpDelete("files/{fileId}")]
    public async Task<IActionResult> DeleteFile(int fileId)
    {
        var entity = await _context.CourseLessonFiles
                .Include(f => f.Lesson)
                    .ThenInclude(l => l.Section)
                .FirstOrDefaultAsync(f => f.Id == fileId);
        if (entity == null)
            return NotFound(new { message = "File not found." });

        var courseId = entity.Lesson.Section.CourseId;
        var sectionId = entity.Lesson.SectionId;
        var lessonId = entity.LessonId;
        var fileFolder = CourseStorageHelper.GetLessonFolder(courseId, sectionId, lessonId);

        var fileName = TryExtractFileName(entity.FileUrl);
        if (!string.IsNullOrEmpty(fileName))
        {
            var physicalPath = Path.Combine(fileFolder, fileName);
            if (System.IO.File.Exists(physicalPath))
                System.IO.File.Delete(physicalPath);
        }

        _context.CourseLessonFiles.Remove(entity);
        await _context.SaveChangesAsync();

        return Ok(new { message = "File deleted." }); }

         private static string TryExtractFileName(string fileUrl)
    {
        if (Uri.TryCreate(fileUrl, UriKind.Absolute, out var uri))
            return Path.GetFileName(uri.LocalPath);

        return Path.GetFileName(fileUrl);
    }
}


// ============================================================
// REQUEST MODELS
// ============================================================
public class CreateSectionRequest
{
    public string Title { get; set; }
    public int Order { get; set; }
}

public class UpdateSectionRequest
{
    public string Title { get; set; }
    public int Order { get; set; }
}

public class CreateLessonRequest
{
    public string Title { get; set; }
    public int Order { get; set; }
}
