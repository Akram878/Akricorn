using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.IO;
using System.Linq;

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
            var books = await _context.Books
              .Include(b => b.Files)
              .ToListAsync();

            var result = books.Select(MapToDto).ToList();

            return Ok(result);
        }

        // =========================
        //  GET: /api/admin/books/{id}
        //  عرض كتاب واحد بالتفصيل
        // =========================
        [HttpGet("{id:int}")]
        public async Task<ActionResult<BookDto>> GetById(int id)
        {
            var book = await _context.Books
               .Include(b => b.Files)
               .FirstOrDefaultAsync(b => b.Id == id);

            if (book == null)
                return NotFound(new { message = "Book not found." });

            return Ok(MapToDto(book));
        }

        // =========================
        //  POST: /api/admin/books
        //  إنشاء كتاب جديد
        // =========================
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBookRequest request)
        {
            var validation = ValidateRequest(request);
            if (validation != null)
                return validation;

            var book = new Book
            {
                Title = request.Title,
                Description = request.Description,
                Price = request.Price,
                Category = request.Category,
                ThumbnailUrl = request.ThumbnailUrl,
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

            var validation = ValidateRequest(request);
            if (validation != null)
                return validation;

            book.Title = request.Title;
            book.Description = request.Description;
            book.Price = request.Price;
            book.FileUrl = request.FileUrl;
            book.Category = request.Category;
            book.ThumbnailUrl = request.ThumbnailUrl;
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
            var book = await _context.Books
                 .Include(b => b.Files)
                 .FirstOrDefaultAsync(b => b.Id == id);

            if (book == null)
                return NotFound(new { message = "Book not found." });

            _context.Books.Remove(book);
            await _context.SaveChangesAsync();

            var folder = BookStorageHelper.GetBookFolder(id);
            if (Directory.Exists(folder))
                Directory.Delete(folder, true);

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

        // =========================
        //  POST: /api/admin/books/{id}/upload-thumbnail
        //  رفع صورة الغلاف
        // =========================
        [HttpPost("{id:int}/upload-thumbnail")]
        [DisableRequestSizeLimit]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadThumbnail(int id, IFormFile file)
        {
            var book = await _context.Books.FirstOrDefaultAsync(b => b.Id == id);

            if (book == null)
                return NotFound(new { message = "Book not found." });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded." });

            var folder = BookStorageHelper.GetThumbnailFolder(id);
            Directory.CreateDirectory(folder);

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var physicalPath = Path.Combine(folder, fileName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativePath = Path.Combine("books", $"book-{id}", "thumbnail", fileName).Replace("\\", "/");
            var url = $"{Request.Scheme}://{Request.Host}/{relativePath}";

            book.ThumbnailUrl = url;
            await _context.SaveChangesAsync();

            return Ok(new { url });
        }

        // =========================
        //  POST: /api/admin/books/{id}/files/upload
        //  رفع ملف للكتاب
        // =========================
        [HttpPost("{id:int}/files/upload")]
        [DisableRequestSizeLimit]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadFile(int id, IFormFile file)
        {
            var book = await _context.Books.Include(b => b.Files).FirstOrDefaultAsync(b => b.Id == id);
            if (book == null)
                return NotFound(new { message = "Book not found." });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded." });

            var folder = BookStorageHelper.GetFilesFolder(id);
            Directory.CreateDirectory(folder);

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var physicalPath = Path.Combine(folder, fileName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativePath = Path.Combine("books", $"book-{id}", "files", fileName).Replace("\\", "/");
            var url = $"{Request.Scheme}://{Request.Host}/{relativePath}";

            var newFile = new BookFile
            {
                BookId = id,
                FileName = file.FileName,
                FileUrl = url,
                SizeBytes = file.Length,
                ContentType = file.ContentType ?? "application/octet-stream"
            };

            _context.BookFiles.Add(newFile);

            if (string.IsNullOrEmpty(book.FileUrl))
                book.FileUrl = url;

            await _context.SaveChangesAsync();

            var dto = MapToDto(book, newFile);

            return Ok(new { message = "File uploaded.", fileId = newFile.Id, url, book = dto });
        }

        // =========================
        //  DELETE: /api/admin/books/files/{fileId}
        //  حذف ملف كتاب
        // =========================
        [HttpDelete("files/{fileId:int}")]
        public async Task<IActionResult> DeleteFile(int fileId)
        {
            var entity = await _context.BookFiles
                .Include(f => f.Book)
                .FirstOrDefaultAsync(f => f.Id == fileId);

            if (entity == null)
                return NotFound(new { message = "File not found." });

            var bookId = entity.BookId;
            var folder = BookStorageHelper.GetFilesFolder(bookId);
            var fileName = TryExtractFileName(entity.FileUrl);
            if (!string.IsNullOrEmpty(fileName))
            {
                var physicalPath = Path.Combine(folder, fileName);
                if (System.IO.File.Exists(physicalPath))
                    System.IO.File.Delete(physicalPath);
            }

            _context.BookFiles.Remove(entity);
            await _context.SaveChangesAsync();

            var book = await _context.Books.Include(b => b.Files).FirstOrDefaultAsync(b => b.Id == bookId);
            if (book != null && book.FileUrl == entity.FileUrl)
            {
                book.FileUrl = book.Files.FirstOrDefault()?.FileUrl ?? string.Empty;
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "File deleted." });
        }

        private IActionResult? ValidateRequest(BaseBookRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(new { message = "Title is required." });

            if (request.Price < 0)
                return BadRequest(new { message = "Price cannot be negative." });

            if (string.IsNullOrWhiteSpace(request.Category))
                return BadRequest(new { message = "Category is required." });

            return null;
        }

        private static BookDto MapToDto(Book book, BookFile? extraFile = null)
        {
            var files = book.Files.ToList();
            if (extraFile != null && files.All(f => f.Id != extraFile.Id))
                files.Add(extraFile);

            return new BookDto
            {
                Id = book.Id,
                Title = book.Title,
                Description = book.Description,
                Price = book.Price,
                Category = book.Category,
                FileUrl = book.FileUrl,
                ThumbnailUrl = book.ThumbnailUrl,
                IsActive = book.IsActive,
                Files = files.Select(f => new BookFileDto
                {
                    Id = f.Id,
                    FileName = f.FileName,
                    FileUrl = f.FileUrl,
                    SizeBytes = f.SizeBytes,
                    ContentType = f.ContentType
                }).ToList()
            };
        }

        private static string? TryExtractFileName(string url)
        {
            if (string.IsNullOrWhiteSpace(url)) return null;

            var parts = url.Split('/', StringSplitOptions.RemoveEmptyEntries);
            return parts.LastOrDefault();
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
        public string Category { get; set; }
        public string FileUrl { get; set; }
        public string? ThumbnailUrl { get; set; }
        public bool IsActive { get; set; }
        public List<BookFileDto> Files { get; set; } = new();
    }

    public class BookFileDto
    {
        public int Id { get; set; }
        public string FileName { get; set; }
        public string FileUrl { get; set; }
        public long SizeBytes { get; set; }
        public string ContentType { get; set; }
    }

    public abstract class BaseBookRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public string Category { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string FileUrl { get; set; }
        public bool IsActive { get; set; } = true;
    }
    public class CreateBookRequest : BaseBookRequest
    {
    }

    public class UpdateBookRequest : BaseBookRequest
    {
    }
}
