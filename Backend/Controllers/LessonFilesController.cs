using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using System.IO;
using Microsoft.AspNetCore.StaticFiles;
namespace Backend.Controllers
{
    [ApiController]
    [Route("api/lessons/files")]
    public class LessonFilesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<LessonFilesController> _logger;

        public LessonFilesController(AppDbContext context, ILogger<LessonFilesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("{fileId}")]
        [Authorize]
        public async Task<IActionResult> GetLessonFile(int fileId)
        {
            var userContext = ResolveUserContext();
            if (!userContext.IsAuthenticated)
            {
                return Unauthorized(new { message = "Unauthorized." });
            }

            var file = await _context.CourseLessonFiles
                .Include(f => f.Lesson)
                    .ThenInclude(l => l.Section)
                .FirstOrDefaultAsync(f => f.Id == fileId);

            if (file == null)
                return NotFound(new { message = "File not found." });

            var courseId = file.Lesson.Section.CourseId;

            if (!userContext.IsAdmin)
            {
                var user = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userContext.UserId);

                if (user == null)
                    return Unauthorized(new { message = "Unauthorized." });

                if (!user.IsActive)
                    return StatusCode(403, new { message = "Your account has been disabled." });

                var enrolled = await _context.UserCourses
                    .AnyAsync(uc => uc.UserId == userContext.UserId && uc.CourseId == courseId);

                if (!enrolled)
                    return StatusCode(403, new { message = "You are not enrolled in this course." });
            }

            var physicalPath = ResolvePhysicalPath(file);
            if (physicalPath == null || !System.IO.File.Exists(physicalPath))
            {
                return NotFound(new { message = "File content not found." });
            }

            var stream = new FileStream(physicalPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            var contentType = file.ContentType;
            if (string.IsNullOrWhiteSpace(contentType))
            {
                var provider = new FileExtensionContentTypeProvider();
                if (!provider.TryGetContentType(physicalPath, out contentType))
                {
                    contentType = "application/octet-stream";
                }
            }
            _logger.LogInformation("Lesson file request: userId={UserId}, fileId={FileId}, courseId={CourseId}", userContext.UserId, fileId, courseId);

            return File(stream, contentType, enableRangeProcessing: true);
        }

        private string? ResolvePhysicalPath(CourseLessonFile file)
        {
            var lesson = file.Lesson;
            var section = lesson.Section;
            var courseId = section.CourseId;
            var lessonFolder = CourseStorageHelper.GetLessonFolder(courseId, section.Id, lesson.Id);

            var storedFileName = TryExtractFileName(file.FileUrl);
            if (string.IsNullOrEmpty(storedFileName))
                return null;

            var primaryPath = Path.Combine(lessonFolder, storedFileName);
            if (System.IO.File.Exists(primaryPath))
                return primaryPath;

            var legacyFolder = Path.Combine(
                CourseStorageHelper.GetLegacyContentFolder(courseId),
                $"section-{section.Id}",
                $"lesson-{lesson.Id}");
            var legacyPath = Path.Combine(legacyFolder, storedFileName);
            if (System.IO.File.Exists(legacyPath))
                return legacyPath;

            return primaryPath;
        }

        private static string? TryExtractFileName(string? fileUrl)
        {
            if (string.IsNullOrWhiteSpace(fileUrl))
                return null;

            if (Uri.TryCreate(fileUrl, UriKind.Absolute, out var uri))
                return Path.GetFileName(uri.LocalPath);

            return Path.GetFileName(fileUrl);
        }

        private UserRequestContext ResolveUserContext()
        {
            var isAdmin = User.Claims.Any(c =>
                string.Equals(c.Type, "IsAdmin", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(c.Value, "true", StringComparison.OrdinalIgnoreCase));

            var userIdClaim = User.Claims.FirstOrDefault(c =>
                c.Type == "Id" ||
                c.Type == "id" ||
                c.Type == ClaimTypes.NameIdentifier ||
                c.Type == "UserId" ||
                c.Type == "userId" ||
                c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);

            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var userId))
            {
                return new UserRequestContext(userId, isAdmin);
            }

            // Admin tokens may not contain a numeric user id
            if (isAdmin)
            {
                return new UserRequestContext(null, true);
            }

            return new UserRequestContext(null, false);
        }

        private record UserRequestContext(int? UserId, bool IsAdmin)
        {
            public bool IsAuthenticated => IsAdmin || UserId.HasValue;
        }
    }
}