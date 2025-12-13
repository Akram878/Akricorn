using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
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
        private readonly ILogger<AdminBooksController> _logger;

        public AdminBooksController(AppDbContext context, ILogger<AdminBooksController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // =========================
        //  GET: /api/admin/books
        //  عرض كل الكتب (للداشبورد)
        // =========================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BookDto>>> GetAll()
        {
            try
            {
                var books = await ExecuteWithMigrationRetry(async () =>
                {
                    return await _context.Books
                        .AsNoTracking()
                        .Include(b => b.Files)
                        .ToListAsync();
                });

                var result = (books ?? new List<Book>())
                             .Select(book => MapToDto(book))
                             .ToList();

                return Ok(result);
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "Database unavailable while loading admin books list.");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "The database is unavailable. Please check the connection string and that the database server is running.",
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error while loading admin books list.");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "An unexpected error occurred while loading the books list. See server logs for details.",
                    error = ex.Message
                });
            }
        }

        // =========================
        //  GET: /api/admin/books/{id}
        //  عرض كتاب واحد بالتفصيل
        // =========================
        [HttpGet("{id:int}")]
        public async Task<ActionResult<BookDto>> GetById(int id)
        {
            try
            {
                var book = await ExecuteWithMigrationRetry(async () =>
                {
                    return await _context.Books
                        .AsNoTracking()
                        .Include(b => b.Files)
                        .FirstOrDefaultAsync(b => b.Id == id);
                });
                if (book == null)
                    return NotFound(new { message = "Book not found." });

                return Ok(MapToDto(book));
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "Database unavailable while loading admin book {BookId}.", id);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "The database is unavailable. Please check the connection string and that the database server is running.",
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error while loading admin book {BookId}.", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "An unexpected error occurred while loading the book. See server logs for details.",
                    error = ex.Message
                });
            }
        }

        // =========================
        //  POST: /api/admin/books
        //  إنشاء كتاب جديد
        // =========================
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBookRequest request)
        {

            if (request == null)
                return BadRequest(new { message = "Request body is required." });

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

            try
            {
                await ExecuteWithMigrationRetry(async () =>
                {
                    _context.Books.Add(book);
                    await _context.SaveChangesAsync();
                });

                return Ok(new { message = "Book created successfully.", bookId = book.Id });
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "Database unavailable while creating a book");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "The database is unavailable. Please check the connection string and that the database server is running.",
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error while creating a book");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "An unexpected error occurred while creating the book. See server logs for details.",
                    error = ex.Message
                });
            }
        }

        // =========================
        //  PUT: /api/admin/books/{id}
        //  تعديل كتاب موجود
        // =========================
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateBookRequest request)
        {

            if (request == null)
                return BadRequest(new { message = "Request body is required." });
            try
            {
                var book = await ExecuteWithMigrationRetry(async () =>
                {
                    return await _context.Books.FirstOrDefaultAsync(b => b.Id == id);
                });

                if (book == null)
                    return NotFound(new { message = "Book not found." });

                var validation = ValidateRequest(request);
                if (validation != null)
                    return validation;

                book.Title = request.Title;
                book.Title = request.Title;
                book.Description = request.Description;
                book.Price = request.Price;
                book.FileUrl = request.FileUrl;
                book.Category = request.Category;
                book.ThumbnailUrl = request.ThumbnailUrl;
                book.IsActive = request.IsActive;


                await ExecuteWithMigrationRetry(async () =>
                {
                    await _context.SaveChangesAsync();
                });

                return Ok(new { message = "Book updated successfully." });
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "Database unavailable while updating book {BookId}.", id);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "The database is unavailable. Please check the connection string and that the database server is running.",
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error while updating book {BookId}.", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "An unexpected error occurred while updating the book. See server logs for details.",
                    error = ex.Message
                });
            }
        }

        // =========================
        //  DELETE: /api/admin/books/{id}
        //  حذف كتاب
        // =========================
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var book = await ExecuteWithMigrationRetry(async () =>
                {
                    return await _context.Books
                        .Include(b => b.Files)
                        .FirstOrDefaultAsync(b => b.Id == id);
                });

                if (book == null)
                    return NotFound(new { message = "Book not found." });
                await ExecuteWithMigrationRetry(async () =>
                {
                    _context.Books.Remove(book);
                    await _context.SaveChangesAsync();
                });

                var folder = BookStorageHelper.GetBookFolder(id);
                if (Directory.Exists(folder))
                    Directory.Delete(folder, true);

                return Ok(new { message = "Book deleted successfully." });
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "Database unavailable while deleting book {BookId}.", id);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "The database is unavailable. Please check the connection string and that the database server is running.",
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error while deleting book {BookId}.", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "An unexpected error occurred while deleting the book. See server logs for details.",
                    error = ex.Message
                });
            }
        }

        // =========================
        //  PATCH: /api/admin/books/{id}/toggle
        //  تفعيل/تعطيل كتاب
        // =========================
        [HttpPatch("{id:int}/toggle")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            try
            {
                var book = await ExecuteWithMigrationRetry(async () =>
                {
                    return await _context.Books.FirstOrDefaultAsync(b => b.Id == id);
                });

                if (book == null)
                    return NotFound(new { message = "Book not found." });
                book.IsActive = !book.IsActive;
                await ExecuteWithMigrationRetry(async () =>
                {
                    await _context.SaveChangesAsync();
                });

                return Ok(new { message = "Book status changed.", isActive = book.IsActive });
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "Database unavailable while toggling book {BookId}.", id);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "The database is unavailable. Please check the connection string and that the database server is running.",
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error while toggling book {BookId}.", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "An unexpected error occurred while toggling the book. See server logs for details.",
                    error = ex.Message
                });
            }
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
            try
            {
                var book = await ExecuteWithMigrationRetry(async () =>
                {
                    return await _context.Books.FirstOrDefaultAsync(b => b.Id == id);
                });

                if (book == null)
                    return NotFound(new { message = "Book not found." });

                if (file == null || file.Length == 0)
                    return BadRequest(new { message = "No file uploaded." });

                var folder = BookStorageHelper.GetThumbnailFolder(id);
                Directory.CreateDirectory(folder);

                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
                var physicalPath = Path.Combine(folder, fileName);

                try
                {

                    using (var stream = new FileStream(physicalPath, FileMode.Create))
                    {
                        await file.CopyToAsync(stream);
                    }

                    var relativePath = Path.Combine("books", $"book-{id}", "thumbnail", fileName).Replace("\\", "/");
                    var url = $"{Request.Scheme}://{Request.Host}/{relativePath}";

                    book.ThumbnailUrl = url;
                    await ExecuteWithMigrationRetry(async () =>
                    {
                        await _context.SaveChangesAsync();
                    });

                    return Ok(new { url });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while uploading thumbnail for book {BookId}", id);
                    return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred while uploading the thumbnail." });
                }
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "Database unavailable while uploading thumbnail for book {BookId}.", id);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "The database is unavailable. Please check the connection string and that the database server is running.",
                    error = ex.Message
                });
            }
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
            

            try
            {
                var book = await ExecuteWithMigrationRetry(async () =>
                {
                    return await _context.Books.Include(b => b.Files).FirstOrDefaultAsync(b => b.Id == id);
                });
                if (book == null)
                    return NotFound(new { message = "Book not found." });

                if (file == null || file.Length == 0)
                    return BadRequest(new { message = "No file uploaded." });

                var folder = BookStorageHelper.GetFilesFolder(id);
                Directory.CreateDirectory(folder);

                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
                var physicalPath = Path.Combine(folder, fileName);

                try
                {
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

                    await ExecuteWithMigrationRetry(async () =>
                    {
                        _context.BookFiles.Add(newFile);

                        if (string.IsNullOrEmpty(book.FileUrl))
                            book.FileUrl = url;

                        await _context.SaveChangesAsync();
                    });

                    var dto = MapToDto(book, newFile);

                    return Ok(new { message = "File uploaded.", fileId = newFile.Id, url, book = dto });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while uploading file for book {BookId}", id);
                    return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred while uploading the file." });
                }
            }
            catch (SqlException ex)
            {
                _logger.LogError(ex, "Database unavailable while uploading file for book {BookId}.", id);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "The database is unavailable. Please check the connection string and that the database server is running.",
                    error = ex.Message
                });
            }
        }

        // =========================
        //  DELETE: /api/admin/books/files/{fileId}
        //  حذف ملف كتاب
        // =========================
        [HttpDelete("files/{fileId:int}")]
        public async Task<IActionResult> DeleteFile(int fileId)
        {
           

            try
            {
                var entity = await ExecuteWithMigrationRetry(async () =>
                {
                    return await _context.BookFiles
                        .Include(f => f.Book)
                        .FirstOrDefaultAsync(f => f.Id == fileId);
                });
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

                try
                {
                    await ExecuteWithMigrationRetry(async () =>
                    {
                        _context.BookFiles.Remove(entity);
                        await _context.SaveChangesAsync();
                    });


                    var book = await ExecuteWithMigrationRetry(async () =>
                    {
                        return await _context.Books.Include(b => b.Files).FirstOrDefaultAsync(b => b.Id == bookId);
                    });
                    if (book != null && book.FileUrl == entity.FileUrl)
                    {
                        book.FileUrl = book.Files.FirstOrDefault()?.FileUrl ?? string.Empty;
                        await ExecuteWithMigrationRetry(async () =>
                        {
                            await _context.SaveChangesAsync();
                        });
                    }

                    return Ok(new { message = "File deleted." });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error while deleting file {FileId} for book {BookId}", fileId, bookId);
                    return StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred while deleting the file." });
                }
            }
            catch (SqlException ex)
            {

                _logger.LogError(ex, "Database unavailable while deleting file {FileId}.", fileId);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    message = "The database is unavailable. Please check the connection string and that the database server is running.",
                    error = ex.Message
                });
            }
        }

        private IActionResult? ValidateRequest(BaseBookRequest request)
        {

            if (request == null)
                return BadRequest(new { message = "Request body is required." });

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
            var files = book.Files?.ToList() ?? new List<BookFile>();
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

        private async Task<T> ExecuteWithMigrationRetry<T>(Func<Task<T>> action)
        {
            try
            {
                return await action();
            }
            catch (SqlException ex) when (IsMissingBookFilesTable(ex))
            {
                _logger.LogWarning(ex, "Detected missing BookFiles table. Applying migrations then retrying query.");

                var migrated = await TryApplyMigrationsAsync();
                if (!migrated)
                    throw;

                return await action();
            }
        }

        private async Task ExecuteWithMigrationRetry(Func<Task> action)
        {
            await ExecuteWithMigrationRetry(async () =>
            {
                await action();
                return true;
            });
        }

        private async Task<bool> TryApplyMigrationsAsync()
        {
            try
            {
                await _context.Database.MigrateAsync();
                return true;
            }
            catch (Exception migrateEx)
            {
                _logger.LogError(migrateEx, "Failed to apply migrations after detecting missing BookFiles table.");
                return false;
            }
        }

        private static bool IsMissingBookFilesTable(SqlException ex)
        {
            // SQL Server error 208 = Invalid object name
            return ex.Number == 208 && ex.Message.Contains("BookFiles", StringComparison.OrdinalIgnoreCase);
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
