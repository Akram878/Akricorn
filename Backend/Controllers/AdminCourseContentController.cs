using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using Backend.Helpers;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;


namespace Backend.Controllers;

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
    private static int FindNextAvailableOrder(IEnumerable<int> usedOrders, int startFrom)
    {
        var used = new HashSet<int>(usedOrders);
        var candidate = Math.Max(1, startFrom);

        while (used.Contains(candidate))
            candidate++;

        return candidate;
    }

    private async Task<object?> BuildCourseContentDto(int courseId)
    {
        var course = await _context.Courses
            .Include(c => c.Sections)
                .ThenInclude(s => s.Lessons)
                    .ThenInclude(l => l.Files)
                       .ThenInclude(f => f.FileMetadata)
            .FirstOrDefaultAsync(c => c.Id == courseId);

        if (course == null)
            return null;

        return new
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
                                name = f.FileMetadata?.OriginalName ?? throw new InvalidOperationException("File metadata missing."),
                                downloadUrl = BuildLessonDownloadUrl(f.Id)
                            })
                        })
                })
        };


    }

    private string BuildLessonDownloadUrl(int fileId)
    {
        return Url.Content($"/api/lessons/files/{fileId}");
    }

    // ============================================================
    // GET COURSE CONTENT
    // ============================================================
    [HttpGet("{courseId}")]
    public async Task<IActionResult> GetCourseContent(int courseId)
    {
        var content = await BuildCourseContentDto(courseId);

        if (content == null)
            return NotFound(new { message = "Course not found." });

        return Ok(content);
    }

    // ============================================================
    // CREATE SECTION
    // ============================================================
    [HttpPost("{courseId}/sections")]
    public async Task<IActionResult> CreateSection(int courseId, [FromBody] CreateSectionRequest request)
    {
        if (!await _context.Courses.AnyAsync(c => c.Id == courseId))
            return NotFound(new { message = "Course not found." });

        var existingSections = await _context.CourseSections
           .Where(s => s.CourseId == courseId)
           .ToListAsync();

        var conflictingSection = existingSections.FirstOrDefault(s => s.Order == request.Order);
        if (conflictingSection != null && !request.ForceInsert)
            return Conflict(new { message = "Order already used for another section.", order = request.Order });

        if (conflictingSection != null)
        {
            var usedOrders = existingSections
                .Where(s => s.Id != conflictingSection.Id)
                .Select(s => s.Order);
            conflictingSection.Order = FindNextAvailableOrder(usedOrders, request.Order + 1);
        }


        var section = new CourseSection
        {
            CourseId = courseId,
            Title = request.Title,
            Order = request.Order
        };

        _context.CourseSections.Add(section);
        await _context.SaveChangesAsync();
        await UpdateCourseTotals(courseId);
        var sectionFolder = CourseStorageHelper.GetSectionFolder(courseId, section.Id);
        Directory.CreateDirectory(sectionFolder);
        var content = await BuildCourseContentDto(courseId);

        return Ok(new { message = "Section created.", id = section.Id, content });
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


        var conflictingSection = await _context.CourseSections
            .FirstOrDefaultAsync(s => s.CourseId == section.CourseId && s.Id != sectionId && s.Order == request.Order);

        if (conflictingSection != null)
        {
            conflictingSection.Order = section.Order;
        }


        section.Title = request.Title;
        section.Order = request.Order;

        await _context.SaveChangesAsync();
        var content = await BuildCourseContentDto(section.CourseId);

        return Ok(new { message = "Section updated.", content });
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

        var courseId = section.CourseId;
        var sectionFolder = CourseStorageHelper.GetSectionFolder(section.CourseId, section.Id);
        if (Directory.Exists(sectionFolder))
            Directory.Delete(sectionFolder, true);
        _context.CourseSections.Remove(section);
        await _context.SaveChangesAsync();
        await UpdateCourseTotals(courseId);
        var content = await BuildCourseContentDto(courseId);

        return Ok(new { message = "Section deleted.", content });
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


        var existingLessons = await _context.CourseLessons
           .Where(l => l.SectionId == sectionId)
           .ToListAsync();

        var conflictingLesson = existingLessons.FirstOrDefault(l => l.Order == request.Order);
        if (conflictingLesson != null && !request.ForceInsert)
            return Conflict(new { message = "Order already used for another lesson.", order = request.Order });

        if (conflictingLesson != null)
        {
            var usedOrders = existingLessons
                .Where(l => l.Id != conflictingLesson.Id)
                .Select(l => l.Order);
            conflictingLesson.Order = FindNextAvailableOrder(usedOrders, request.Order + 1);
        }


        var lesson = new CourseLesson
        {
            SectionId = sectionId,
            Title = request.Title,
            Order = request.Order
        };

        _context.CourseLessons.Add(lesson);

        await _context.SaveChangesAsync();
        await UpdateCourseTotals(section.CourseId);
        var lessonFolder = CourseStorageHelper.GetLessonFolder(section.CourseId, sectionId, lesson.Id);
        Directory.CreateDirectory(lessonFolder);


        var content = await BuildCourseContentDto(section.CourseId);

        return Ok(new { message = "Lesson created.", id = lesson.Id, content });
    }

    // ============================================================
    // UPDATE LESSON
    // ============================================================
    [HttpPut("lessons/{lessonId}")]
    public async Task<IActionResult> UpdateLesson(int lessonId, [FromBody] UpdateLessonRequest request)
    {
        var lesson = await _context.CourseLessons
            .Include(l => l.Section)
            .FirstOrDefaultAsync(l => l.Id == lessonId);

        if (lesson == null)
            return NotFound(new { message = "Lesson not found." });

        var conflictingLesson = await _context.CourseLessons
            .FirstOrDefaultAsync(l => l.SectionId == lesson.SectionId && l.Id != lessonId && l.Order == request.Order);

        if (conflictingLesson != null)
        {
            conflictingLesson.Order = lesson.Order;
        }

        lesson.Title = request.Title;
        lesson.Order = request.Order;

        await _context.SaveChangesAsync();

        var content = await BuildCourseContentDto(lesson.Section.CourseId);

        return Ok(new { message = "Lesson updated.", content });
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
        var courseId = lesson.Section.CourseId;
        var lessonFolder = CourseStorageHelper.GetLessonFolder(lesson.Section.CourseId, lesson.SectionId, lesson.Id);
        if (Directory.Exists(lessonFolder))
            Directory.Delete(lessonFolder, true);
        _context.CourseLessons.Remove(lesson);
        await _context.SaveChangesAsync();
        await UpdateCourseTotals(courseId);
        var content = await BuildCourseContentDto(courseId);

        return Ok(new { message = "Lesson deleted.", content });
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



            if (!FileValidationHelper.ValidateCourseFile(file, out var validationError))
                return BadRequest(new { message = validationError });

            var folder = CourseStorageHelper.GetLessonFolder(lesson.Section.CourseId, lesson.SectionId, lesson.Id);
            Directory.CreateDirectory(folder);

            var originalName = ExtractOriginalName(file);
            var storedName = $"{Guid.NewGuid()}{Path.GetExtension(originalName)}";
            var path = Path.Combine(folder, storedName);

            using (var stream = new FileStream(path, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var extension = Path.GetExtension(originalName);
            var metadata = new FileMetadata
            {
                OriginalName = originalName,
                StoredName = storedName,
                Size = file.Length,
                MimeType = ResolveMimeType(file),
                Extension = extension,
                OwnerEntityType = "CourseLesson",
                OwnerEntityId = lesson.Id
            };

            _context.FileMetadata.Add(metadata);

            var newFile = new CourseLessonFile
            {
                LessonId = lessonId,
                FileMetadata = metadata,
                FileName = originalName,
                FileUrl = storedName,
                SizeBytes = file.Length,
                ContentType = ResolveMimeType(file),
                UploadedAt = DateTime.UtcNow
            };

            _context.CourseLessonFiles.Add(newFile);
            await _context.SaveChangesAsync();

            var content = await BuildCourseContentDto(lesson.Section.CourseId);
            var fileAccessUrl = BuildLessonDownloadUrl(newFile.Id);

            return Ok(new
            {
                message = "File uploaded.",
                id = newFile.Id,
                url = fileAccessUrl,
                content
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
                     .Include(f => f.FileMetadata)
                .FirstOrDefaultAsync(f => f.Id == fileId);
        if (entity == null)
            return NotFound(new { message = "File not found." });

        var courseId = entity.Lesson.Section.CourseId;
        var sectionId = entity.Lesson.SectionId;
        var lessonId = entity.LessonId;
        var fileFolder = CourseStorageHelper.GetLessonFolder(courseId, sectionId, lessonId);

        var metadata = entity.FileMetadata ?? throw new InvalidOperationException("File metadata missing for lesson file.");
        var physicalPath = Path.Combine(fileFolder, metadata.StoredName);
        if (System.IO.File.Exists(physicalPath))
            System.IO.File.Delete(physicalPath);

        _context.CourseLessonFiles.Remove(entity);
        await _context.SaveChangesAsync();


        var content = await BuildCourseContentDto(courseId);

        return Ok(new { message = "File deleted.", content });
    }

    private async Task UpdateCourseTotals(int courseId)
    {
        var totalSections = await _context.CourseSections.CountAsync(s => s.CourseId == courseId);
        var totalLessons = await _context.CourseLessons
            .Where(l => l.Section.CourseId == courseId)
            .CountAsync();

        var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
        if (course == null)
            return;

        course.TotalSections = totalSections;
        course.TotalLessons = totalLessons;
        await _context.SaveChangesAsync();
    }

    private static string ExtractOriginalName(IFormFile file)
    {
        var disposition = file?.ContentDisposition ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(disposition))
        {
            var tokens = disposition.Split(';', StringSplitOptions.RemoveEmptyEntries);
            foreach (var token in tokens)
            {
                var trimmed = token.Trim();
                if (trimmed.StartsWith("filename*", StringComparison.OrdinalIgnoreCase) ||
                    trimmed.StartsWith("filename", StringComparison.OrdinalIgnoreCase))
                {
                    var idx = trimmed.IndexOf('=');
                    if (idx >= 0 && idx + 1 < trimmed.Length)
                    {
                        var value = trimmed[(idx + 1)..].Trim('\"');
                        return Uri.UnescapeDataString(value);
                    }
                }
            }
        }

        return "file";
    }

    private static string ResolveMimeType(IFormFile file)
    {
        var mime = file?.Headers?["Content-Type"].ToString();
        return string.IsNullOrWhiteSpace(mime) ? "application/octet-stream" : mime;
    }
}



// ============================================================
// REQUEST MODELS
// ============================================================
public class CreateSectionRequest
{
    public string Title { get; set; }
    public int Order { get; set; }
    public bool ForceInsert { get; set; } = false;
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
    public bool ForceInsert { get; set; } = false;
}

public class UpdateLessonRequest
{
    public string Title { get; set; }
    public int Order { get; set; }
}
