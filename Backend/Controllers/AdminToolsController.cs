using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System;
using Backend.Helpers;
using Microsoft.AspNetCore.Http;
using System.IO;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/admin/tools")]
    [Authorize(Policy = "AdminOnly")]
    public class AdminToolsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminToolsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: /api/admin/tools
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ToolDto>>> GetAll()
        {
            var tools = await _context.Tools
                   .Include(t => t.Files)
                     .ThenInclude(f => f.FileMetadata)
                .OrderBy(t => t.DisplayOrder)
                .ToListAsync();

            var result = tools.Select(t => MapToDto(t)).ToList();

            return Ok(result);
        }

        // GET: /api/admin/tools/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ToolDto>> GetById(int id)
        {
            var tool = await _context.Tools
               .Include(t => t.Files)
               .ThenInclude(f => f.FileMetadata)
               .FirstOrDefaultAsync(t => t.Id == id);

            if (tool == null)
                return NotFound(new { message = "Tool not found." });
            return Ok(MapToDto(tool));
        }

        // POST: /api/admin/tools
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateToolRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "Name is required." });

            if (request.Files?.Any() == true)
                return BadRequest(new { message = "Files must be uploaded using the dedicated upload endpoint." });

          
            var tool = new Tool
            {
                Name = request.Name,
                Description = request.Description,
                Url = request.Url,
                Category = request.Category ?? string.Empty,
                IsActive = request.IsActive,
                DisplayOrder = request.DisplayOrder,
                AvatarUrl = request.AvatarUrl ?? string.Empty,
                Files = new List<ToolFile>()
            };

            _context.Tools.Add(tool);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Tool created successfully.", toolId = tool.Id });
        }

        // PUT: /api/admin/tools/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateToolRequest request)
        {
            var tool = await _context.Tools
              .Include(t => t.Files)
              .ThenInclude(f => f.FileMetadata)
              .FirstOrDefaultAsync(t => t.Id == id);

            if (tool == null)
                return NotFound(new { message = "Tool not found." });

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "Name is required." });

            if (request.Files?.Any() == true)
                return BadRequest(new { message = "Files must be uploaded using the dedicated upload endpoint." });

           

            tool.Name = request.Name;
            tool.Description = request.Description;
            tool.Url = request.Url;
            tool.Category = request.Category ?? string.Empty;
            tool.IsActive = request.IsActive;
            tool.DisplayOrder = request.DisplayOrder;
            tool.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? tool.AvatarUrl : request.AvatarUrl;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Tool updated successfully." });
        }

        // DELETE: /api/admin/tools/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var tool = await _context.Tools
                .Include(t => t.Files)
                  .ThenInclude(f => f.FileMetadata)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (tool == null)
                return NotFound(new { message = "Tool not found." });

            if (tool.Files != null && tool.Files.Any())
            {
                _context.ToolFiles.RemoveRange(tool.Files);
            }


            _context.Tools.Remove(tool);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Tool deleted successfully." });
        }


        // =========================
        //  POST: /api/admin/tools/{id}/upload-avatar
        //  رفع الصورة الرمزية للأداة
        // =========================
        [HttpPost("{id:int}/upload-avatar")]
        [DisableRequestSizeLimit]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadAvatar(int id, IFormFile file)
        {
            var tool = await _context.Tools.FirstOrDefaultAsync(t => t.Id == id);

            if (tool == null)
                return NotFound(new { message = "Tool not found." });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded." });

            if (!FileValidationHelper.ValidateIconFile(file, out var validationError))
                return BadRequest(new { message = validationError });

            var folder = ToolStorageHelper.GetAvatarFolder(id);
            Directory.CreateDirectory(folder);

            var storedName = $"{Guid.NewGuid()}{Path.GetExtension(GetOriginalName(file))}";
            var physicalPath = Path.Combine(folder, storedName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativePath = Path.Combine("tools", $"tool-{id}", "avatar", storedName).Replace("\\", "/");
            var url = $"{Request.Scheme}://{Request.Host}/{relativePath}";

            tool.AvatarUrl = url;
            await _context.SaveChangesAsync();

            return Ok(new { url });
        }

        // =========================
        //  POST: /api/admin/tools/{id}/files/upload
        //  رفع ملف أداة
        // =========================
        [HttpPost("{id:int}/files/upload")]
        [DisableRequestSizeLimit]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadFile(int id, IFormFile file)
        {
            var tool = await _context.Tools.Include(t => t.Files).ThenInclude(f => f.FileMetadata).FirstOrDefaultAsync(t => t.Id == id);

            if (tool == null)
                return NotFound(new { message = "Tool not found." });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded." });

            if (!FileValidationHelper.ValidateToolFile(file, out var toolValidationError))
                return BadRequest(new { message = toolValidationError });


            var folder = ToolStorageHelper.GetFilesFolder(id);
            Directory.CreateDirectory(folder);

            var originalName = GetOriginalName(file);
            var storedName = $"{Guid.NewGuid()}{Path.GetExtension(originalName)}";
            var physicalPath = Path.Combine(folder, storedName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var extension = Path.GetExtension(originalName);
            var metadata = new FileMetadata
            {
                OriginalName = originalName,
                StoredName = storedName,
                Size = file.Length,
                MimeType = GetMime(file),
                Extension = extension,
                OwnerEntityType = "Tool",
                OwnerEntityId = id
            };

            _context.FileMetadata.Add(metadata);

            var newFile = new ToolFile
            {
                ToolId = id,
                FileMetadata = metadata
            };

            _context.ToolFiles.Add(newFile);
            await _context.SaveChangesAsync();

            var fileAccessUrl = BuildToolDownloadUrl(newFile.Id);
            return Ok(new { message = "File uploaded.", fileId = newFile.Id, url = fileAccessUrl });
        }

        // =========================
        //  GET: /api/admin/tools/files/{fileId}
        //  تحميل ملف أداة (أدمن فقط)
        // =========================
        [HttpGet("files/{fileId:int}")]
        public async Task<IActionResult> DownloadFile(int fileId)
        {
            var entity = await _context.ToolFiles.Include(f => f.FileMetadata).FirstOrDefaultAsync(f => f.Id == fileId);
          
            if (entity == null)
                return NotFound(new { message = "File not found." });

            if (entity.FileMetadata == null ||
                string.IsNullOrWhiteSpace(entity.FileMetadata.StoredName) ||
                string.IsNullOrWhiteSpace(entity.FileMetadata.MimeType))
            {
                return StatusCode(500, new { message = "File metadata is missing or incomplete for this tool file." });
            }

            var fileName = entity.FileMetadata.StoredName;

            var folder = ToolStorageHelper.GetFilesFolder(entity.ToolId);
            var physicalPath = Path.Combine(folder, fileName);
            if (!System.IO.File.Exists(physicalPath))
                return StatusCode(500, new { message = "File metadata exists but the stored file is missing." });

            var stream = new FileStream(physicalPath, FileMode.Open, FileAccess.Read, FileShare.Read);
            var contentType = entity.FileMetadata.MimeType;

            return File(stream, contentType, enableRangeProcessing: true);
        }

        // =========================
        //  DELETE: /api/admin/tools/files/{fileId}
        //  حذف ملف أداة
        // =========================
        [HttpDelete("files/{fileId:int}")]
        public async Task<IActionResult> DeleteFile(int fileId)
        {
            var entity = await _context.ToolFiles.Include(f => f.FileMetadata).FirstOrDefaultAsync(f => f.Id == fileId);

            if (entity == null)
                return NotFound(new { message = "File not found." });

            if (entity.FileMetadata == null || string.IsNullOrWhiteSpace(entity.FileMetadata.StoredName))
                return StatusCode(500, new { message = "File metadata is missing or incomplete for this tool file." });

            var folder = ToolStorageHelper.GetFilesFolder(entity.ToolId);
            var fileName = entity.FileMetadata.StoredName;

            var physicalPath = Path.Combine(folder, fileName);
            if (!System.IO.File.Exists(physicalPath))
                return StatusCode(500, new { message = "File metadata exists but the stored file is missing." });

            System.IO.File.Delete(physicalPath);

            _context.ToolFiles.Remove(entity);
            await _context.SaveChangesAsync();

            return Ok(new { message = "File deleted." });
        }

        private static ToolDto MapToDto(Tool tool)
        {
            var files = tool.Files ?? new List<ToolFile>();

            foreach (var file in files)
            {
                if (file.FileMetadata == null ||
                    string.IsNullOrWhiteSpace(file.FileMetadata.OriginalName) ||
                    string.IsNullOrWhiteSpace(file.FileMetadata.StoredName) ||
                    string.IsNullOrWhiteSpace(file.FileMetadata.MimeType))
                {
                    throw new InvalidOperationException($"File metadata is missing or incomplete for tool file {file.Id}.");
                }
            }

            return new ToolDto
            {
                Id = tool.Id,
                Name = tool.Name,
                Description = tool.Description,
                Url = tool.Url,
                Category = tool.Category,
                IsActive = tool.IsActive,
                DisplayOrder = tool.DisplayOrder,
                AvatarUrl = tool.AvatarUrl,
                Files = files.Select(f => new ToolFileDto
                {
                    Id = f.Id,
                    OriginalName = f.FileMetadata.OriginalName,
                    StoredName = f.FileMetadata.StoredName,
                    DownloadUrl = BuildToolDownloadUrlStatic(f.Id),
                    Size = f.FileMetadata.Size,
                    MimeType = f.FileMetadata.MimeType
                }).ToList()
            };
        }

        // PATCH: /api/admin/tools/{id}/toggle
        [HttpPatch("{id:int}/toggle")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var tool = await _context.Tools.FirstOrDefaultAsync(t => t.Id == id);

            if (tool == null)
                return NotFound(new { message = "Tool not found." });

            tool.IsActive = !tool.IsActive;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Tool status changed.", isActive = tool.IsActive });
        }

        private static string BuildToolDownloadUrlStatic(int fileId)
        {
            return $"/api/admin/tools/files/{fileId}";
        }

        private string BuildToolDownloadUrl(int fileId)
        {
            return Url.Content($"/api/admin/tools/files/{fileId}");
        }

        private static string GetOriginalName(IFormFile file)
        {
            var header = file?.ContentDisposition ?? string.Empty;
            var token = "filename=\"";
            var start = header.IndexOf(token, StringComparison.OrdinalIgnoreCase);
            if (start >= 0)
            {
                start += token.Length;
                var end = header.IndexOf("\"", start, StringComparison.OrdinalIgnoreCase);
                if (end > start)
                    return header[start..end];
            }

            return file?.Name ?? string.Empty;
        }

        private static string GetMime(IFormFile file)
        {
            if (file?.Headers != null && file.Headers.TryGetValue("Content-Type", out var values) && values.Count > 0)
                return values[0];

            return "application/octet-stream";
        }
    }

    // DTOs
    public class ToolDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Url { get; set; }
        public string Category { get; set; }
        public bool IsActive { get; set; }
        public int DisplayOrder { get; set; }
        public string AvatarUrl { get; set; }
        public List<ToolFileDto> Files { get; set; } = new();
    }

    public class CreateToolRequest
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string Url { get; set; }
        public string Category { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; } = 0;
        public string AvatarUrl { get; set; } = string.Empty;
        public List<ToolFileDto> Files { get; set; } = new();
    }

    public class UpdateToolRequest
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string Url { get; set; }
        public string Category { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; } = 0;
        public string AvatarUrl { get; set; } = string.Empty;
        public List<ToolFileDto> Files { get; set; } = new();
    }

    public class ToolFileDto
    {
        public int Id { get; set; }
        public string OriginalName { get; set; }
        public string StoredName { get; set; }
        public string DownloadUrl { get; set; }
        public long Size { get; set; }
        public string MimeType { get; set; }
    }
}
