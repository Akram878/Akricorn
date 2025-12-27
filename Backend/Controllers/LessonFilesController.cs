using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using System.IO;
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
                .Include(f => f.FileMetadata)
                .FirstOrDefaultAsync(f => f.Id == fileId);

            if (file == null)
                return NotFound(new { message = "File not found." });

            if (file.FileMetadata == null || string.IsNullOrWhiteSpace(file.FileMetadata.StoredName) || string.IsNullOrWhiteSpace(file.FileMetadata.MimeType))
                return StatusCode(500, new { message = "File metadata is missing or incomplete for this lesson file." });

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

                var hasAccess = await HasCourseAccess(userContext.UserId.Value, courseId);

                if (!hasAccess)
                    return StatusCode(403, new { message = "You are not enrolled in this course." });
            }

            var physicalPath = ResolvePhysicalPath(file);
            if (physicalPath == null || !System.IO.File.Exists(physicalPath))
            {
                return StatusCode(500, new { message = "File metadata exists but the stored file is missing." });
            }

            var stream = new FileStream(physicalPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            var contentType = file.FileMetadata.MimeType;
            _logger.LogInformation("Lesson file request: userId={UserId}, fileId={FileId}, courseId={CourseId}", userContext.UserId, fileId, courseId);

            return File(stream, contentType, enableRangeProcessing: true);
        }

        private async Task<bool> HasCourseAccess(int userId, int courseId)
        {
            var ownsCourse = await _context.UserCourses
                .AnyAsync(uc => uc.UserId == userId && uc.CourseId == courseId);

            if (ownsCourse)
                return true;

            var pathIds = await _context.UserPurchases
                .Where(up => up.UserId == userId &&
                             up.PurchaseType == PurchaseType.LearningPath &&
                             up.LearningPathId != null)
                .Select(up => up.LearningPathId.Value)
                .ToListAsync();

            if (pathIds.Count == 0)
                return false;

            return await _context.LearningPathCourses
                .AnyAsync(lpc => pathIds.Contains(lpc.LearningPathId) && lpc.CourseId == courseId);
        }

        private string? ResolvePhysicalPath(CourseLessonFile file)
        {
            var lesson = file.Lesson;
            var section = lesson.Section;
            var courseId = section.CourseId;
            var lessonFolder = CourseStorageHelper.GetLessonFolder(courseId, section.Id, lesson.Id);

            if (file.FileMetadata == null || string.IsNullOrWhiteSpace(file.FileMetadata.StoredName))
                return null;

            return Path.Combine(lessonFolder, file.FileMetadata.StoredName);
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
