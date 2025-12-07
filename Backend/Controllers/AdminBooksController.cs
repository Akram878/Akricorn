using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/admin/books")]
    [Authorize(Policy = "AdminOnly")]
    public class AdminBooksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminBooksController(AppDbContext context)
        {
            _context = context;
        }

        // =========================
        //  GET: /api/admin/books
        //  عرض كل الكتب (للداشبورد)
        // =========================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BookDto>>> GetAll()
        {
            var books = await _context.Books.ToListAsync();

            var result = books.Select(b => new BookDto
            {
                Id = b.Id,
                Title = b.Title,
                Description = b.Description,
                Price = b.Price,
                FileUrl = b.FileUrl,
                IsActive = b.IsActive
            }).ToList();

            return Ok(result);
        }

        // =========================
        //  GET: /api/admin/books/{id}
        //  عرض كتاب واحد بالتفصيل
        // =========================
        [HttpGet("{id:int}")]
        public async Task<ActionResult<BookDto>> GetById(int id)
        {
            var book = await _context.Books.FirstOrDefaultAsync(b => b.Id == id);

            if (book == null)
                return NotFound(new { message = "Book not found." });

            var dto = new BookDto
            {
                Id = book.Id,
                Title = book.Title,
                Description = book.Description,
                Price = book.Price,
                FileUrl = book.FileUrl,
                IsActive = book.IsActive
            };

            return Ok(dto);
        }

        // =========================
        //  POST: /api/admin/books
        //  إنشاء كتاب جديد
        // =========================
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBookRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new { message = "Title is required." });

            if (request.Price < 0)
                return BadRequest(new { message = "Price cannot be negative." });

            var book = new Book
            {
                Title = request.Title,
                Description = request.Description,
                Price = request.Price,
                FileUrl = request.FileUrl,
                IsActive = request.IsActive
            };

            _context.Books.Add(book);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Book created successfully.", bookId = book.Id });
        }

        // =========================
        //  PUT: /api/admin/books/{id}
        //  تعديل كتاب موجود
        // =========================
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateBookRequest request)
        {
            var book = await _context.Books.FirstOrDefaultAsync(b => b.Id == id);

            if (book == null)
                return NotFound(new { message = "Book not found." });

            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new { message = "Title is required." });

            if (request.Price < 0)
                return BadRequest(new { message = "Price cannot be negative." });

            book.Title = request.Title;
            book.Description = request.Description;
            book.Price = request.Price;
            book.FileUrl = request.FileUrl;
            book.IsActive = request.IsActive;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Book updated successfully." });
        }

        // =========================
        //  DELETE: /api/admin/books/{id}
        //  حذف كتاب
        // =========================
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var book = await _context.Books.FirstOrDefaultAsync(b => b.Id == id);

            if (book == null)
                return NotFound(new { message = "Book not found." });

            _context.Books.Remove(book);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Book deleted successfully." });
        }

        // =========================
        //  PATCH: /api/admin/books/{id}/toggle
        //  تفعيل/تعطيل كتاب
        // =========================
        [HttpPatch("{id:int}/toggle")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var book = await _context.Books.FirstOrDefaultAsync(b => b.Id == id);

            if (book == null)
                return NotFound(new { message = "Book not found." });

            book.IsActive = !book.IsActive;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Book status changed.", isActive = book.IsActive });
        }
    }

    // ==========================
    //   DTOs للكتب
    // ==========================

    public class BookDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string FileUrl { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateBookRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string FileUrl { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class UpdateBookRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string FileUrl { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
