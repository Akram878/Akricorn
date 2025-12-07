using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
                .OrderBy(t => t.DisplayOrder)
                .ToListAsync();

            var result = tools.Select(t => new ToolDto
            {
                Id = t.Id,
                Name = t.Name,
                Description = t.Description,
                Url = t.Url,
                Category = t.Category,
                IsActive = t.IsActive,
                DisplayOrder = t.DisplayOrder
            }).ToList();

            return Ok(result);
        }

        // GET: /api/admin/tools/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ToolDto>> GetById(int id)
        {
            var tool = await _context.Tools.FirstOrDefaultAsync(t => t.Id == id);

            if (tool == null)
                return NotFound(new { message = "Tool not found." });

            var dto = new ToolDto
            {
                Id = tool.Id,
                Name = tool.Name,
                Description = tool.Description,
                Url = tool.Url,
                Category = tool.Category,
                IsActive = tool.IsActive,
                DisplayOrder = tool.DisplayOrder
            };

            return Ok(dto);
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
                DisplayOrder = request.DisplayOrder
            };

            _context.Tools.Add(tool);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Tool created successfully.", toolId = tool.Id });
        }

        // PUT: /api/admin/tools/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateToolRequest request)
        {
            var tool = await _context.Tools.FirstOrDefaultAsync(t => t.Id == id);

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

            await _context.SaveChangesAsync();

            return Ok(new { message = "Tool updated successfully." });
        }

        // DELETE: /api/admin/tools/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var tool = await _context.Tools.FirstOrDefaultAsync(t => t.Id == id);

            if (tool == null)
                return NotFound(new { message = "Tool not found." });

            _context.Tools.Remove(tool);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Tool deleted successfully." });
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
    }

    public class CreateToolRequest
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string Url { get; set; }
        public string Category { get; set; }
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; } = 0;
    }

    public class UpdateToolRequest
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public string Url { get; set; }
        public string Category { get; set; }
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; } = 0;
    }
}
