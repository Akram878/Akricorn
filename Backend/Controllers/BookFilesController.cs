using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using System.IO;
using System;
using System.Threading.Tasks;
using System.Linq;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/books/files")]
    public class BookFilesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<BookFilesController> _logger;

        public BookFilesController(AppDbContext context, ILogger<BookFilesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("{fileId:int}")]
        [Authorize]
        public async Task<IActionResult> GetBookFile(int fileId)
        {
            var userContext = ResolveUserContext();
            if (!userContext.IsAuthenticated)
            {
                return Unauthorized(new { message = "Invalid token." });
            }

            var file = await _context.BookFiles
                .Include(f => f.Book)
                .FirstOrDefaultAsync(f => f.Id == fileId);

            if (file == null)
                return NotFound(new { message = "File not found." });

            if (!userContext.IsAdmin)
            {
                var user = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userContext.UserId);

                if (user == null)
                    return Unauthorized(new { message = "User not found." });

                if (!user.IsActive)
                    return StatusCode(403, new { message = "Your account has been disabled." });

                var ownsBook = await _context.UserBooks
                    .AnyAsync(ub => ub.UserId == userContext.UserId && ub.BookId == file.BookId);

                if (!ownsBook)
                    return StatusCode(403, new { message = "You do not own this book." });
            }

            var physicalPath = ResolvePhysicalPath(file);
            if (physicalPath == null || !System.IO.File.Exists(physicalPath))
            {
                return NotFound(new { message = "File content not found." });
            }

            var stream = new FileStream(physicalPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            var contentType = string.IsNullOrWhiteSpace(file.ContentType)
                ? "application/octet-stream"
                : file.ContentType;

            _logger.LogInformation("Book file request: userId={UserId}, fileId={FileId}, bookId={BookId}", userContext.UserId, fileId, file.BookId);

            return File(stream, contentType, enableRangeProcessing: true);
        }

        private string? ResolvePhysicalPath(BookFile file)
        {
            var storedFileName = TryExtractFileName(file.FileUrl);
            if (string.IsNullOrEmpty(storedFileName))
                return null;

            var primaryFolder = BookStorageHelper.GetFilesFolder(file.BookId);
            var primaryPath = Path.Combine(primaryFolder, storedFileName);
            if (System.IO.File.Exists(primaryPath))
                return primaryPath;

            var legacyFolder = BookStorageHelper.GetLegacyFilesFolder(file.BookId);
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