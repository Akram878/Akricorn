using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;

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

            if (string.IsNullOrWhiteSpace(request.Url))
                return BadRequest(new { message = "Url is required." });

            var tool = new Tool
            {
                Name = request.Name,
                Description = request.Description,
                Url = request.Url,
                Category = request.Category,
                IsActive = request.IsActive,
                DisplayOrder = request.DisplayOrder,
                AvatarUrl = request.AvatarUrl,
                Files = new List<ToolFile>()
            };

            _context.Tools.Add(tool);
            await _context.SaveChangesAsync();

            if (request.Files?.Any() == true)
            {
                var files = request.Files.Select(f => new ToolFile
                {
                    ToolId = tool.Id,
                    FileName = f.FileName,
                    FileUrl = f.FileUrl,
                    SizeBytes = f.SizeBytes,
                    ContentType = f.ContentType
                }).ToList();

                _context.ToolFiles.AddRange(files);
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Tool created successfully.", toolId = tool.Id });
        }

        // PUT: /api/admin/tools/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateToolRequest request)
        {
            var tool = await _context.Tools
              .Include(t => t.Files)
              .FirstOrDefaultAsync(t => t.Id == id);

            if (tool == null)
                return NotFound(new { message = "Tool not found." });

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "Name is required." });

            if (string.IsNullOrWhiteSpace(request.Url))
                return BadRequest(new { message = "Url is required." });

            tool.Name = request.Name;
            tool.Description = request.Description;
            tool.Url = request.Url;
            tool.Category = request.Category;
            tool.IsActive = request.IsActive;
            tool.DisplayOrder = request.DisplayOrder;
            tool.AvatarUrl = request.AvatarUrl;

            if (tool.Files != null && tool.Files.Any())
            {
                _context.ToolFiles.RemoveRange(tool.Files);
            }

            if (request.Files?.Any() == true)
            {
                var files = request.Files.Select(f => new ToolFile
                {
                    ToolId = tool.Id,
                    FileName = f.FileName,
                    FileUrl = f.FileUrl,
                    SizeBytes = f.SizeBytes,
                    ContentType = f.ContentType
                }).ToList();

                _context.ToolFiles.AddRange(files);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Tool updated successfully." });
        }

        // DELETE: /api/admin/tools/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var tool = await _context.Tools
                .Include(t => t.Files)
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
        private static ToolDto MapToDto(Tool tool)
        {
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
                Files = tool.Files?.Select(f => new ToolFileDto
                {
                    Id = f.Id,
                    FileName = f.FileName,
                    FileUrl = f.FileUrl,
                    SizeBytes = f.SizeBytes,
                    ContentType = f.ContentType
                }).ToList() ?? new List<ToolFileDto>()
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
        public string Category { get; set; }
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; } = 0;
        public string AvatarUrl { get; set; }
        public List<ToolFileDto> Files { get; set; } = new();
    }

    public class UpdateToolRequest
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string Url { get; set; }
        public string Category { get; set; }
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; } = 0;
        public string AvatarUrl { get; set; }
        public List<ToolFileDto> Files { get; set; } = new();
    }

    public class ToolFileDto
    {
        public int Id { get; set; }
        public string FileName { get; set; }
        public string FileUrl { get; set; }
        public long SizeBytes { get; set; }
        public string ContentType { get; set; }
    }
}
