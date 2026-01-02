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
                return Unauthorized(new { message = "Unauthorized." });
            }

            var file = await _context.BookFiles
                .Include(f => f.Book)
                .Include(f => f.FileMetadata)
                .FirstOrDefaultAsync(f => f.Id == fileId);

            if (file == null)
                return NotFound(new { message = "File not found." });

            if (file.FileMetadata == null || string.IsNullOrWhiteSpace(file.FileMetadata.StoredName) || string.IsNullOrWhiteSpace(file.FileMetadata.MimeType))
                return StatusCode(500, new { message = "File metadata is missing or incomplete for this book file." });

            if (!userContext.IsAdmin)
            {
                var user = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userContext.UserId);

                if (user == null)
                    return Unauthorized(new { message = "Unauthorized." });

                if (!user.IsActive)
                    return StatusCode(403, new { message = "Your account has been disabled." });

                var userBook = await _context.UserBooks
                      .FirstOrDefaultAsync(ub => ub.UserId == userContext.UserId && ub.BookId == file.BookId);

                if (userBook == null)
                    return StatusCode(403, new { message = "You do not own this book." });

                if (!userBook.CompletedAt.HasValue)
                {
                    userBook.CompletedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }

            var physicalPath = ResolvePhysicalPath(file);
            if (physicalPath == null || !System.IO.File.Exists(physicalPath))
                return StatusCode(500, new { message = "File metadata exists but the stored file is missing." });

            var stream = new FileStream(physicalPath, FileMode.Open, FileAccess.Read, FileShare.Read);

            var contentType = file.FileMetadata.MimeType;

            _logger.LogInformation("Book file request: userId={UserId}, fileId={FileId}, bookId={BookId}", userContext.UserId, fileId, file.BookId);

            return File(stream, contentType, enableRangeProcessing: true);
        }

        private string? ResolvePhysicalPath(BookFile file)
        {
            if (file.FileMetadata == null || string.IsNullOrWhiteSpace(file.FileMetadata.StoredName))
                return null;

            var folder = BookStorageHelper.GetFilesFolder(file.BookId);
            return Path.Combine(folder, file.FileMetadata.StoredName);
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
