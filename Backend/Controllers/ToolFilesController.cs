using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/tools/files")]
    public class ToolFilesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ToolFilesController> _logger;

        public ToolFilesController(AppDbContext context, ILogger<ToolFilesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("{fileId:int}")]
        [Authorize]
        public async Task<IActionResult> GetToolFile(int fileId)
        {
            var userContext = ResolveUserContext();
            if (!userContext.IsAuthenticated)
            {
                return Unauthorized(new { message = "Unauthorized." });
            }

            if (!userContext.IsAdmin)
            {
                var user = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userContext.UserId);

                if (user == null)
                    return Unauthorized(new { message = "Unauthorized." });

                if (!user.IsActive)
                    return StatusCode(403, new { message = "Your account has been disabled." });
            }

            var file = await _context.ToolFiles
                .Include(f => f.Tool)
                .Include(f => f.FileMetadata)
                .FirstOrDefaultAsync(f => f.Id == fileId);

            if (file == null)
                return NotFound(new { message = "File not found." });

            if (!userContext.IsAdmin && (file.Tool == null || !file.Tool.IsActive))
                return StatusCode(403, new { message = "Tool is not available." });

            if (file.FileMetadata == null ||
                string.IsNullOrWhiteSpace(file.FileMetadata.StoredName) ||
                string.IsNullOrWhiteSpace(file.FileMetadata.MimeType))
            {
                return StatusCode(500, new { message = "File metadata is missing or incomplete for this tool file." });
            }

            var physicalPath = ResolvePhysicalPath(file);
            if (physicalPath == null || !System.IO.File.Exists(physicalPath))
                return StatusCode(500, new { message = "File metadata exists but the stored file is missing." });

            var stream = new FileStream(physicalPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            var contentType = file.FileMetadata.MimeType;

            _logger.LogInformation("Tool file request: userId={UserId}, fileId={FileId}, toolId={ToolId}", userContext.UserId, fileId, file.ToolId);

            return File(stream, contentType, enableRangeProcessing: true);
        }

        private string? ResolvePhysicalPath(ToolFile file)
        {
            if (file.FileMetadata == null || string.IsNullOrWhiteSpace(file.FileMetadata.StoredName))
                return null;

            var folder = ToolStorageHelper.GetFilesFolder(file.ToolId);
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