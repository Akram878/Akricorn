using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/lms")]
    public class LmsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LmsController(AppDbContext context)
        {
            _context = context;
        }

        // ============================
        //             Stats
        // ============================
        [HttpGet("stats")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLmsStats()
        {
            var activeCourses = await _context.Courses.CountAsync(c => c.IsActive);
            var activeLearningPaths = await _context.LearningPaths.CountAsync(p => p.IsActive);
            var activeBooks = await _context.Books.CountAsync(b => b.IsActive);

            return Ok(new
            {
                activeCourses,
                activeLearningPaths,
                activeBooks
            });
        }
       

        // ============================
        //       Course Content
        // ============================
        [HttpGet("courses/{courseId}/content")]
        [Authorize]
        public async Task<IActionResult> GetCourseContent(int courseId)
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

            var hasAccess = await HasCourseAccess(userContext.UserId.Value, courseId);

            if (!hasAccess)
                return StatusCode(403, new { message = "You are not enrolled in this course." });
            }
        var course = await _context.Courses
            .Include(c => c.Sections)
                .ThenInclude(s => s.Lessons)
                    .ThenInclude(l => l.Files)
                        .ThenInclude(f => f.FileMetadata)
            .FirstOrDefaultAsync(c => c.Id == courseId && c.IsActive);

            if (course == null)
                return NotFound(new { message = "Course not found." });

            var result = course.Sections
                .OrderBy(s => s.Order)
                .Select(s => new
                {
                    sectionId = s.Id,
                    sectionTitle = s.Title,
                    sectionOrder = s.Order,
                    lessons = s.Lessons
                        .OrderBy(l => l.Order)
                        .Select(l => new
                        {
                            lessonId = l.Id,
                            lessonTitle = l.Title,
                            lessonOrder = l.Order,
                            files = l.Files
                                .OrderBy(f => f.Id)
                                .Select(f => new
                                {
                                    fileId = f.Id,
                                    name = f.FileMetadata?.OriginalName ?? throw new InvalidOperationException("File metadata missing."),
                                    url = BuildLessonDownloadUrl(f.Id),
                                    uploadedAt = f.UploadedAt
                                })
                        })
                });

            return Ok(result);
        }

        // ============================
        //         Public Books
        // ============================
        [HttpGet("books")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBooks()
        {
            var books = await _context.Books
                .Where(b => b.IsActive)
                .Select(b => new
                {
                    b.Id,
                    b.Title,
                    b.Description,
                    b.Price,
                    b.Category,
                    b.ThumbnailUrl
                })
                .ToListAsync();

            var ratingStats = await _context.BookRatings
                .GroupBy(r => r.BookId)
                .Select(g => new { BookId = g.Key, Count = g.Count(), Average = Math.Round(g.Average(x => x.Rating), 2) })
                .ToDictionaryAsync(x => x.BookId, x => x);

            var result = books.Select(b =>
            {
                var stats = ratingStats.TryGetValue(b.Id, out var s) ? s : null;
                return new
                {
                    b.Id,
                    b.Title,
                    b.Description,
                    b.Price,
                    b.Category,
                    b.ThumbnailUrl,
                    rating = stats?.Average ?? 0,
                    ratingCount = stats?.Count ?? 0
                };
            }).ToList();

            return Ok(result);
        }

        // ============================
        //      Purchase Book
        // ============================
        [HttpPost("books/{bookId}/purchase")]
        [Authorize]
        public async Task<IActionResult> PurchaseBook(int bookId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null)
                    return Unauthorized(new { message = "Unauthorized." });

                if (!user.IsActive)
                    return StatusCode(403, new { message = "Your account has been disabled." });

                var book = await _context.Books
                    .FirstOrDefaultAsync(b => b.Id == bookId && b.IsActive);

                if (book == null)
                    return NotFound(new { message = "Book not found." });

                var alreadyOwned = await _context.UserBooks
                    .AnyAsync(ub => ub.UserId == userId && ub.BookId == bookId);

                if (alreadyOwned)
                    return BadRequest(new { message = "You already own this book." });

                var userBook = new UserBook
                {
                    UserId = userId.Value,
                    BookId = bookId,
                    GrantedAt = DateTime.UtcNow,
                    IsFromCourse = false
                };

                _context.UserBooks.Add(userBook);

                var hasPurchase = await _context.UserPurchases
                    .AnyAsync(up => up.UserId == userId.Value &&
                                    up.PurchaseType == PurchaseType.Book &&
                                    up.BookId == bookId);

                if (!hasPurchase)
                {
                    var userPurchase = new UserPurchase
                    {
                        UserId = userId.Value,
                        PurchaseType = PurchaseType.Book,
                        BookId = bookId,
                        PurchasedAt = DateTime.UtcNow
                    };

                    _context.UserPurchases.Add(userPurchase);
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Book purchased successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Error while purchasing book.",
                    inner = ex.InnerException?.Message ?? ex.Message
                });
            }
        }

        [HttpPost("learning-paths/{pathId}/purchase")]
        [Authorize]
        public async Task<IActionResult> PurchaseLearningPath(int pathId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var learningPath = await _context.LearningPaths
                .Include(lp => lp.LearningPathCourses)
                .FirstOrDefaultAsync(lp => lp.Id == pathId && lp.IsActive);

            if (learningPath == null)
                return NotFound(new { message = "Learning path not found." });

            var alreadyPurchased = await _context.UserPurchases
                .AnyAsync(up => up.UserId == userId.Value &&
                                up.PurchaseType == PurchaseType.LearningPath &&
                                up.LearningPathId == pathId);

            if (alreadyPurchased)
                return Conflict(new { message = "You already own this learning path." });



            var amount = Backend.Helpers.PricingHelper.CalculateDiscountedPrice(learningPath.Price, learningPath.Discount);

            var payment = new Payment
            {
                UserId = userId.Value,
                Amount = amount,
                Currency = "USD",
                Status = PaymentStatus.Succeeded,
                TargetType = "LearningPath",
                TargetId = learningPath.Id,
                Description = $"Purchase learning path: {learningPath.Title}",
                Provider = "DemoPay",
                ExternalReference = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow
            };

            _context.Payments.Add(payment);

            var userPurchase = new UserPurchase
            {
                UserId = userId.Value,
                PurchaseType = PurchaseType.LearningPath,
                LearningPathId = learningPath.Id,
                PurchasedAt = DateTime.UtcNow
            };

            _context.UserPurchases.Add(userPurchase);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Learning path purchased successfully.",
                paymentId = payment.Id,
                learningPathId = learningPath.Id,
                amount = payment.Amount,
                currency = payment.Currency,
                discount = learningPath.Discount
            });
        }

        // ============================
        //           Ratings
        // ============================
        [HttpPost("/api/ratings/course/{courseId}")]
        [Authorize]
        public async Task<IActionResult> RateCourse(int courseId, [FromBody] RatingRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (request == null || request.Rating < 1 || request.Rating > 5)
                return BadRequest(new { message = "Rating must be between 1 and 5." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var userCourse = await _context.UserCourses
                .AsNoTracking()
                .FirstOrDefaultAsync(uc => uc.UserId == userId.Value && uc.CourseId == courseId);

            if (userCourse == null || !userCourse.CompletedAt.HasValue)
                return StatusCode(403, new { message = "You must complete the course before rating." });

            var alreadyRated = await _context.CourseRatings
                .AnyAsync(r => r.UserId == userId.Value && r.CourseId == courseId);

            if (alreadyRated)
                return BadRequest(new { message = "You have already rated this course." });

            var course = await _context.Courses
                .FirstOrDefaultAsync(c => c.Id == courseId && c.IsActive);

            if (course == null)
                return NotFound(new { message = "Course not found." });

            var existingRatings = await _context.CourseRatings
                .Where(r => r.CourseId == courseId)
                .Select(r => r.Rating)
                .ToListAsync();

            existingRatings.Add(request.Rating);

            course.Rating = Math.Round(existingRatings.Average(), 2);
            var courseRatingCount = existingRatings.Count;

            var rating = new CourseRating
            {
                UserId = userId.Value,
                CourseId = courseId,
                Rating = request.Rating,
                Comment = request.Comment ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            _context.CourseRatings.Add(rating);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Course rated successfully.", averageRating = course.Rating, ratingCount = courseRatingCount });
        }

        [HttpPost("/api/ratings/book/{bookId}")]
        [Authorize]
        public async Task<IActionResult> RateBook(int bookId, [FromBody] RatingRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (request == null || request.Rating < 1 || request.Rating > 5)
                return BadRequest(new { message = "Rating must be between 1 and 5." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var book = await _context.Books
                .FirstOrDefaultAsync(b => b.Id == bookId && b.IsActive);

            if (book == null)
                return NotFound(new { message = "Book not found." });

            var userBook = await _context.UserBooks
                .AsNoTracking()
                .FirstOrDefaultAsync(ub => ub.UserId == userId.Value && ub.BookId == bookId);

            if (userBook == null)
                return StatusCode(403, new { message = "You must own this book before rating." });

            if (!userBook.CompletedAt.HasValue)
                return BadRequest(new { message = "Book must be completed before rating." });

            var alreadyRated = await _context.BookRatings
                .AnyAsync(r => r.UserId == userId.Value && r.BookId == bookId);

            if (alreadyRated)
                return BadRequest(new { message = "You have already rated this book." });

            var existingRatings = await _context.BookRatings
                .Where(r => r.BookId == bookId)
                .Select(r => r.Rating)
                .ToListAsync();

            existingRatings.Add(request.Rating);

            var bookAverage = Math.Round(existingRatings.Average(), 2);
            var bookRatingCount = existingRatings.Count;

            var rating = new BookRating
            {
                UserId = userId.Value,
                BookId = bookId,
                Rating = request.Rating,
                Comment = request.Comment ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            _context.BookRatings.Add(rating);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Book rated successfully.", averageRating = bookAverage, ratingCount = bookRatingCount });
        }

        [HttpPost("/api/ratings/path/{learningPathId}")]
        [Authorize]
        public async Task<IActionResult> RateLearningPath(int learningPathId, [FromBody] RatingRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (request == null || request.Rating < 1 || request.Rating > 5)
                return BadRequest(new { message = "Rating must be between 1 and 5." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var learningPath = await _context.LearningPaths
                .Include(lp => lp.LearningPathCourses)
                .FirstOrDefaultAsync(lp => lp.Id == learningPathId && lp.IsActive);

            if (learningPath == null)
                return NotFound(new { message = "Learning path not found." });

            var courseIds = learningPath.LearningPathCourses?
                .Select(lpc => lpc.CourseId)
                .Distinct()
                .ToList() ?? new List<int>();

            if (courseIds.Count == 0)
                return StatusCode(403, new { message = "Complete the learning path before rating." });

            var completedCourseIds = await _context.UserCourses
                .Where(uc => uc.UserId == userId.Value && uc.CompletedAt != null && courseIds.Contains(uc.CourseId))
                .Select(uc => uc.CourseId)
                .Distinct()
                .ToListAsync();

            if (completedCourseIds.Count != courseIds.Count)
                return StatusCode(403, new { message = "Complete all courses in the learning path before rating." });

            var alreadyRated = await _context.LearningPathRatings
                .AnyAsync(r => r.UserId == userId.Value && r.LearningPathId == learningPathId);

            if (alreadyRated)
                return BadRequest(new { message = "You have already rated this learning path." });

            var existingRatings = await _context.LearningPathRatings
                .Where(r => r.LearningPathId == learningPathId)
                .Select(r => r.Rating)
                .ToListAsync();

            existingRatings.Add(request.Rating);

            learningPath.Rating = Math.Round(existingRatings.Average(), 2);
            var learningPathRatingCount = existingRatings.Count;

            var rating = new LearningPathRating
            {
                UserId = userId.Value,
                LearningPathId = learningPathId,
                Rating = request.Rating,
                Comment = request.Comment ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            _context.LearningPathRatings.Add(rating);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Learning path rated successfully.", averageRating = learningPath.Rating, ratingCount = learningPathRatingCount });
        }

        // ============================
        //         My Courses
        // ============================
        [HttpGet("my-courses")]
        [Authorize]
        public async Task<IActionResult> GetMyCourses()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var myCourseEntities = await _context.UserCourses
                .Where(uc => uc.UserId == userId.Value)
                .Include(uc => uc.Course)
                  .ThenInclude(c => c.LearningPathCourses)
                        .ThenInclude(lp => lp.LearningPath)
                .ToListAsync();

            var courseIds = myCourseEntities.Select(uc => uc.CourseId).Distinct().ToList();
            var paymentAmounts = await _context.Payments
               .Where(p => p.UserId == userId.Value && p.TargetType == "Course" && courseIds.Contains(p.TargetId))
               .GroupBy(p => p.TargetId)
               .Select(g => new
               {
                   CourseId = g.Key,
                   Amount = g.OrderByDescending(p => p.CreatedAt).Select(p => p.Amount).FirstOrDefault()
               })
               .ToDictionaryAsync(x => x.CourseId, x => x.Amount);
            var courseRatings = await _context.CourseRatings
                .Where(r => courseIds.Contains(r.CourseId))
                .GroupBy(r => r.CourseId)
                .Select(g => new { CourseId = g.Key, Count = g.Count(), Average = Math.Round(g.Average(x => x.Rating), 2) })
                .ToDictionaryAsync(x => x.CourseId, x => x);

            var myCourses = myCourseEntities.Select(uc =>
            {
                var stats = courseRatings.TryGetValue(uc.CourseId, out var s) ? s : null;
                var paidAmount = paymentAmounts.TryGetValue(uc.CourseId, out var amount) ? amount : uc.Course.Price;
                return new
                {
                    uc.Course.Id,
                    uc.Course.Title,
                    uc.Course.Description,
                    price = paidAmount,
                    uc.Course.Hours,
                    uc.Course.Category,
                    uc.Course.ThumbnailUrl,
                    pathTitle = uc.Course.LearningPathCourses
                        .Select(lp => lp.LearningPath.Title)
                        .FirstOrDefault(),
                    rating = stats?.Average ?? uc.Course.Rating,
                    ratingCount = stats?.Count ?? 0,
                    uc.PurchasedAt,
                    uc.CompletedAt
                };
            }).ToList();

            return Ok(myCourses);
        }

        [HttpGet("my-courses/{courseId}")]
        [Authorize]
        public async Task<IActionResult> GetMyCourseDetails(int courseId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var hasAccess = await HasCourseAccess(userId.Value, courseId);

            if (!hasAccess)
                return StatusCode(403, new { message = "You are not enrolled in this course." });

            var course = await _context.Courses
             .Include(c => c.Sections)
                .ThenInclude(s => s.Lessons)
                        .ThenInclude(l => l.Files)
                            .ThenInclude(f => f.FileMetadata)
            .Include(c => c.LearningPathCourses)
                .ThenInclude(lp => lp.LearningPath)
            .FirstOrDefaultAsync(c => c.Id == courseId && c.IsActive);

            if (course == null)
                return NotFound(new { message = "Course not found in your library." });

            var userCourse = await _context.UserCourses
                .AsNoTracking()
                .FirstOrDefaultAsync(uc => uc.UserId == userId.Value && uc.CourseId == courseId);

            var pathIds = course.LearningPathCourses?
                .Select(lp => lp.LearningPathId)
                .Distinct()
                .ToList() ?? new List<int>();

            Dictionary<int, int> totalByPath = new();
            Dictionary<int, int> completedByPath = new();
            Dictionary<int, DateTime?> completedAtByPath = new();

            if (pathIds.Count > 0)
            {
                var pathCourses = await _context.LearningPathCourses
                    .Where(lpc => pathIds.Contains(lpc.LearningPathId))
                    .ToListAsync();

                totalByPath = pathCourses
                    .GroupBy(lpc => lpc.LearningPathId)
                    .ToDictionary(g => g.Key, g => g.Count());

                var courseIdsInPaths = pathCourses.Select(lpc => lpc.CourseId).Distinct().ToList();
                var courseProgress = await BuildCourseProgressMap(userId.Value, courseIdsInPaths);

                foreach (var group in pathCourses.GroupBy(lpc => lpc.LearningPathId))
                {
                    var courseIds = group.Select(g => g.CourseId).Distinct().ToList();
                    var completedCourses = courseIds.Count(cid =>
                        courseProgress.TryGetValue(cid, out var cp) && cp.IsCompleted);

                    completedByPath[group.Key] = completedCourses;

                    if (completedCourses == courseIds.Count)
                    {
                        var pathCompletedAt = courseIds
                            .Select(cid => courseProgress.TryGetValue(cid, out var cp) ? cp.CompletedAt : null)
                            .Where(dt => dt.HasValue)
                            .Select(dt => dt.Value)
                            .DefaultIfEmpty()
                            .Max();

                        completedAtByPath[group.Key] = pathCompletedAt;
                    }
                    else
                    {
                        completedAtByPath[group.Key] = null;
                    }
                }
            }

            var sections = course.Sections
                .OrderBy(s => s.Order)
                .Select(s => new
                {
                    id = s.Id,
                    title = s.Title,
                    order = s.Order,
                    lessons = s.Lessons
                        .OrderBy(l => l.Order)
                        .Select(l => new
                        {
                            id = l.Id,
                            title = l.Title,
                            order = l.Order,
                            files = l.Files
                                .OrderBy(f => f.Id)
                                .Select(f => new
                                {
                                    id = f.Id,
                                    name = f.FileMetadata?.OriginalName ?? throw new InvalidOperationException("File metadata missing."),
                                    url = BuildLessonDownloadUrl(f.Id),
                                    uploadedAt = f.UploadedAt
                                })
                        })
                });

            var learningPaths =
                (course.LearningPathCourses?
                    .Select(lp => lp.LearningPath)
                    .Where(lp => lp != null)
                    .Distinct()
                    .Select(lp => new
                    {
                        learningPathId = lp.Id,
                        learningPathTitle = lp.Title,
                        totalCourses = totalByPath.TryGetValue(lp.Id, out var total) ? total : 0,
                        completedCourses = completedByPath.TryGetValue(lp.Id, out var completed) ? completed : 0,
                        completionPercent = CalculateCompletionPercent(totalByPath, completedByPath, lp.Id),
                        completedAt = completedAtByPath.TryGetValue(lp.Id, out var completedAt) ? completedAt : null
                    })
                ) ?? Enumerable.Empty<object>();

            var courseRatingStats = await GetCourseRatingStats(course.Id);
            var paidAmount = await _context.Payments
               .Where(p => p.UserId == userId.Value && p.TargetType == "Course" && p.TargetId == course.Id)
               .OrderByDescending(p => p.CreatedAt)
               .Select(p => (decimal?)p.Amount)
               .FirstOrDefaultAsync();

            return Ok(new
            {
                id = course.Id,
                title = course.Title,
                description = course.Description,
                price = paidAmount ?? course.Price,
                hours = course.Hours,
                category = course.Category,
                rating = courseRatingStats.Average,
                ratingCount = courseRatingStats.Count,
                thumbnailUrl = course.ThumbnailUrl,
                purchasedAt = userCourse?.PurchasedAt,
                completedAt = userCourse?.CompletedAt,
                sections,
                learningPaths
            });
        }


        [HttpPost("my-courses/{courseId}/complete")]
        [Authorize]
        public async Task<IActionResult> CompleteMyCourse(int courseId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var hasAccess = await HasCourseAccess(userId.Value, courseId);
            if (!hasAccess)
                return StatusCode(403, new { message = "You are not enrolled in this course." });

            var userCourse = await _context.UserCourses
                .Where(uc => uc.UserId == userId.Value && uc.CourseId == courseId)
                .Include(uc => uc.Course)
                    .ThenInclude(c => c.LearningPathCourses)
                        .ThenInclude(lp => lp.LearningPath)
                .FirstOrDefaultAsync();

            var course = userCourse?.Course ??
                await _context.Courses
                    .Include(c => c.LearningPathCourses)
                        .ThenInclude(lp => lp.LearningPath)
                    .FirstOrDefaultAsync(c => c.Id == courseId);

            if (course == null)
                return NotFound(new { message = "Course not found in your library." });

            if (!await IsCourseCompletedByLessons(userId.Value, courseId))
                return BadRequest(new { message = "Complete all lessons before finishing the course." });

            var now = DateTime.UtcNow;
            if (userCourse != null && userCourse.CompletedAt == null)
                userCourse.CompletedAt = now;

            var pathIds = course.LearningPathCourses?
                .Select(lp => lp.LearningPathId)
                .Distinct()
                .ToList() ?? new List<int>();

            if (pathIds.Count > 0)
            {
                var existingProgress = await _context.UserLearningPathCourseProgresses
                    .Where(p => p.UserId == userId.Value &&
                                p.CourseId == courseId &&
                                pathIds.Contains(p.LearningPathId))
                    .ToListAsync();

                foreach (var pathId in pathIds)
                {
                    if (!existingProgress.Any(p => p.LearningPathId == pathId))
                    {
                        _context.UserLearningPathCourseProgresses.Add(
                            new UserLearningPathCourseProgress
                            {
                                UserId = userId.Value,
                                CourseId = courseId,
                                LearningPathId = pathId,
                                CompletedAt = now
                            });
                    }
                }
            }

            await _context.SaveChangesAsync();

            var totalByPath = new Dictionary<int, int>();
            var completedByPath = new Dictionary<int, int>();
            var completedAtByPath = new Dictionary<int, DateTime?>();

            if (pathIds.Count > 0)
            {
                var pathCourses = await _context.LearningPathCourses
                    .Where(lpc => pathIds.Contains(lpc.LearningPathId))
                    .ToListAsync();

                totalByPath = pathCourses
                    .GroupBy(lpc => lpc.LearningPathId)
                    .ToDictionary(g => g.Key, g => g.Count());

                var courseIdsInPaths = pathCourses.Select(lpc => lpc.CourseId).Distinct().ToList();
                var courseProgress = await BuildCourseProgressMap(userId.Value, courseIdsInPaths);

                foreach (var group in pathCourses.GroupBy(lpc => lpc.LearningPathId))
                {
                    var courseIds = group.Select(g => g.CourseId).Distinct().ToList();
                    var completedCourses = courseIds.Count(cid =>
                        courseProgress.TryGetValue(cid, out var cp) && cp.IsCompleted);

                    completedByPath[group.Key] = completedCourses;

                    if (completedCourses == courseIds.Count && courseIds.Count > 0)
                    {
                        var pathCompletedAt = courseIds
                            .Select(cid => courseProgress.TryGetValue(cid, out var cp) ? cp.CompletedAt : null)
                            .Where(dt => dt.HasValue)
                            .Select(dt => dt.Value)
                            .DefaultIfEmpty()
                            .Max();

                        completedAtByPath[group.Key] = pathCompletedAt;
                    }
                    else
                    {
                        completedAtByPath[group.Key] = null;
                    }
                }
            }

            var pathStatuses =
                (course.LearningPathCourses?
                    .Select(lp => lp.LearningPath)
                    .Where(lp => lp != null)
                    .Distinct()
                    .Select(lp => new
                    {
                        learningPathId = lp.Id,
                        learningPathTitle = lp.Title,
                        totalCourses = totalByPath.TryGetValue(lp.Id, out var total) ? total : 0,
                        completedCourses = completedByPath.TryGetValue(lp.Id, out var completed) ? completed : 0,
                        completionPercent = CalculateCompletionPercent(totalByPath, completedByPath, lp.Id),
                        completedAt = completedAtByPath.TryGetValue(lp.Id, out var completedAt) ? completedAt : null
                    })
                ) ?? Enumerable.Empty<object>();

            return Ok(new
            {
                message = "Course marked as completed.",
                completedAt = userCourse?.CompletedAt,
                learningPaths = pathStatuses
            });
        }
        [HttpPost("my-courses/{courseId}/lessons/{lessonId}/complete")]
        [Authorize]
        public async Task<IActionResult> CompleteLesson(int courseId, int lessonId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var lesson = await _context.CourseLessons
                .Include(l => l.Section)
                .FirstOrDefaultAsync(l => l.Id == lessonId);

            if (lesson == null || lesson.Section.CourseId != courseId)
                return NotFound(new { message = "Lesson not found in this course." });

            var ownsCourse = await HasCourseAccess(userId.Value, courseId);

            if (!ownsCourse)
                return StatusCode(403, new { message = "You are not enrolled in this course." });

            var existing = await _context.UserLessonProgresses
                .FirstOrDefaultAsync(p => p.UserId == userId.Value && p.LessonId == lessonId);

            if (existing == null)
            {
                _context.UserLessonProgresses.Add(new UserLessonProgress
                {
                    UserId = userId.Value,
                    LessonId = lessonId,
                    CompletedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            var isCompleted = await IsCourseCompletedByLessons(userId.Value, courseId);
            if (isCompleted)
            {
                var userCourse = await _context.UserCourses
                    .Include(uc => uc.Course)
                        .ThenInclude(c => c.LearningPathCourses)
                            .ThenInclude(lp => lp.LearningPath)
                    .FirstOrDefaultAsync(uc => uc.UserId == userId.Value && uc.CourseId == courseId);

                if (userCourse != null && userCourse.CompletedAt == null)
                {
                    var now = DateTime.UtcNow;
                    userCourse.CompletedAt = now;

                    var pathIds = userCourse.Course.LearningPathCourses?
                        .Select(lp => lp.LearningPathId)
                        .Distinct()
                        .ToList() ?? new List<int>();

                    if (pathIds.Count > 0)
                    {
                        var existingProgress = await _context.UserLearningPathCourseProgresses
                            .Where(p => p.UserId == userId.Value &&
                                        p.CourseId == courseId &&
                                        pathIds.Contains(p.LearningPathId))
                            .ToListAsync();

                        foreach (var pathId in pathIds)
                        {
                            if (!existingProgress.Any(p => p.LearningPathId == pathId))
                            {
                                _context.UserLearningPathCourseProgresses.Add(
                                    new UserLearningPathCourseProgress
                                    {
                                        UserId = userId.Value,
                                        CourseId = courseId,
                                        LearningPathId = pathId,
                                        CompletedAt = now
                                    });
                            }
                        }
                    }

                    await _context.SaveChangesAsync();
                }
            }

            return Ok(new { message = "Lesson marked as completed.", courseCompleted = isCompleted });
        }




        // ============================
        //         My Books
        // ============================
        [HttpGet("my-books")]
        [Authorize]
        public async Task<IActionResult> GetMyBooks()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            var userBooks = await _context.UserBooks
                .Where(ub => ub.UserId == userId.Value)
                .Include(ub => ub.Book)
                .ThenInclude(b => b.Files)
                .ToListAsync();

            var books = userBooks.Select(ub =>
            {
            var primaryFileId = ub.Book.Files
                .OrderBy(f => f.Id)
                .Select(f => f.Id)
                .FirstOrDefault();

            return new
            {
                    ub.Book.Id,
                    ub.Book.Title,
                    ub.Book.Description,
                    ub.Book.Price,
                    ub.Book.Category,
                    ub.Book.ThumbnailUrl,
                downloadUrl = primaryFileId > 0 ? BuildBookDownloadUrl(primaryFileId) : string.Empty,
                ub.GrantedAt,
                    ub.IsFromCourse
            };
            }).ToList();

            return Ok(books);
        }



        // ============================
        //          Public Tools
        // ============================
        [HttpGet("tools")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTools()
        {
            var tools = await _context.Tools
                .Where(t => t.IsActive)
                .OrderBy(t => t.DisplayOrder)
                .ThenBy(t => t.Name)
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    t.Description,
                    t.Url,
                    t.Category,
                    t.DisplayOrder
                })
                .ToListAsync();

            return Ok(tools);
        }

        // ============================
        //       Learning Paths
        // ============================
        [HttpGet("paths")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLearningPaths()
        {

            var userContext = ResolveUserContext();
            int? userId = null;

            if (userContext.IsAuthenticated && !userContext.IsAdmin && userContext.UserId.HasValue)
            {
                var user = await _context.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userContext.UserId.Value);

                if (user == null)
                    return Unauthorized(new { message = "Unauthorized." });

                if (!user.IsActive)
                    return StatusCode(403, new { message = "Your account has been disabled." });

                userId = user.Id;
            }

            var paths = await _context.LearningPaths
                .Where(p => p.IsActive)
                .Include(p => p.LearningPathCourses)
              .ThenInclude(lpc => lpc.Course)
                .OrderBy(p => p.Title)
                .ToListAsync();

            var pathRatingStats = await _context.LearningPathRatings
                .GroupBy(r => r.LearningPathId)
                .Select(g => new
                {
                    LearningPathId = g.Key,
                    Count = g.Count(),
                    Average = Math.Round(g.Average(x => x.Rating), 2)
                })
                .ToDictionaryAsync(x => x.LearningPathId, x => x);

            var courseProgress = new Dictionary<int, CourseProgressInfo>();
            if (userId.HasValue)
            {
                var courseIds = paths
                    .SelectMany(p => p.LearningPathCourses)
                    .Where(lpc => lpc.Course != null && lpc.Course.IsActive)
                    .Select(lpc => lpc.CourseId)
                    .Distinct()
                    .ToList();

                courseProgress = await BuildCourseProgressMap(userId.Value, courseIds);
            }

            var result = paths.Select(p =>
            {
            var courses = p.LearningPathCourses
                .Where(lpc => lpc.Course != null && lpc.Course.IsActive)
                .OrderBy(lpc => lpc.StepOrder)
                .Select(lpc =>
                {
                    var hasProgress = courseProgress.TryGetValue(lpc.CourseId, out var cp);
                    var isCompleted = hasProgress && cp.IsCompleted;
                    var isInProgress = hasProgress && cp.InProgress;

                    return new
                    {
                        lpc.CourseId,
                        lpc.StepOrder,
                        title = lpc.Course.Title,
                        description = lpc.Course.Description,
                        price = lpc.Course.Price,
                        category = lpc.Course.Category,
                        hours = lpc.Course.Hours,
                        rating = lpc.Course.Rating,
                        thumbnailUrl = lpc.Course.ThumbnailUrl,
                        isCompleted,
                        isInProgress
                    };
                })
                .ToList();

            var completedCount = courses.Count(c => c.isCompleted);
            var totalCourses = courses.Count;
            var completionPercent = totalCourses == 0
                ? 0
                : Math.Min(100, Math.Round((double)completedCount / totalCourses * 100, 2));

            DateTime? completedAt = null;
            if (completedCount == totalCourses && totalCourses > 0)
            {
                completedAt = courses
                    .Select(c => courseProgress.TryGetValue(c.CourseId, out var cp) ? cp.CompletedAt : null)
                    .Where(dt => dt.HasValue)
                    .Select(dt => dt.Value)
                    .DefaultIfEmpty()
                    .Max();
            }

            return new
            {
                    p.Id,
                    p.Title,
                    p.Description,
                    p.Price,
                    rating = pathRatingStats.TryGetValue(p.Id, out var pathRatings) ? pathRatings.Average : p.Rating,
                    ratingCount = pathRatingStats.TryGetValue(p.Id, out var pathRatings2) ? pathRatings2.Count : 0,
                    p.Discount,
                coursesCount = totalCourses,
                completedCourses = completedCount,
                completionPercent,
                completedAt,
                courses
            };
            });

            return Ok(result);
        }

        // ============================
        //         Utilities
        // ============================

        private string BuildLessonDownloadUrl(int fileId)
        {
            return Url.Content($"/api/lessons/files/{fileId}");
        }


        private string BuildBookDownloadUrl(int fileId)
        {
            return Url.Content($"/api/books/files/{fileId}");
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

        private async Task<Dictionary<int, CourseProgressInfo>> BuildCourseProgressMap(int userId, IEnumerable<int> courseIds)
        {
            var ids = courseIds?.Distinct().ToList() ?? new List<int>();
            if (ids.Count == 0)
                return new Dictionary<int, CourseProgressInfo>();

            var totalLessons = await _context.CourseLessons
                .Where(l => ids.Contains(l.Section.CourseId))
                .GroupBy(l => l.Section.CourseId)
                .Select(g => new { CourseId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CourseId, x => x.Count);

            var completedLessons = await _context.UserLessonProgresses
                .Where(p => p.UserId == userId && ids.Contains(p.Lesson.Section.CourseId))
                .GroupBy(p => p.Lesson.Section.CourseId)
                .Select(g => new
                {
                    CourseId = g.Key,
                    Count = g.Count(),
                    LastCompletedAt = g.Max(x => x.CompletedAt)
                })
                .ToListAsync();

            var map = new Dictionary<int, CourseProgressInfo>();

            foreach (var courseId in ids)
            {
                totalLessons.TryGetValue(courseId, out var total);
                var completed = completedLessons.FirstOrDefault(x => x.CourseId == courseId);
                var completedCount = completed?.Count ?? 0;
                var isCompleted = total == 0 || completedCount >= total;
                var inProgress = completedCount > 0 && !isCompleted;
                var completedAt = isCompleted ? completed?.LastCompletedAt : (DateTime?)null;

                map[courseId] = new CourseProgressInfo(total, completedCount, isCompleted, inProgress, completedAt);
            }

            return map;
        }

        private async Task<RatingStats> GetCourseRatingStats(int courseId)
        {
            var stats = await _context.CourseRatings
                .Where(r => r.CourseId == courseId)
                .GroupBy(r => r.CourseId)
                .Select(g => new RatingStats(Math.Round(g.Average(x => x.Rating), 2), g.Count()))
                .FirstOrDefaultAsync();

            return stats ?? new RatingStats(0, 0);
        }

        private record RatingStats(double Average, int Count);

        private async Task<bool> IsCourseCompletedByLessons(int userId, int courseId)
        {
            var totalLessons = await _context.CourseLessons
                .Where(l => l.Section.CourseId == courseId)
                .CountAsync();

            if (totalLessons == 0)
                return true;

            var completedLessons = await _context.UserLessonProgresses
                .Where(p => p.UserId == userId && p.Lesson.Section.CourseId == courseId)
                .CountAsync();

            return completedLessons >= totalLessons;
        }
        private double CalculateCompletionPercent(
            IDictionary<int, int> totalByPath,
            IDictionary<int, int> completedByPath,
            int pathId)
        {
            if (!totalByPath.TryGetValue(pathId, out var totalCourses) || totalCourses == 0)
                return 0;

            completedByPath.TryGetValue(pathId, out var completedCourses);
            var percent = (double)completedCourses / totalCourses * 100;

            return Math.Min(100, Math.Round(percent, 2));
        }



        // ============================
        //         Helper
        // ============================
        private int? GetCurrentUserId()
        {
            var userIdClaim = User.Claims.FirstOrDefault(c =>
                c.Type == "Id" ||
                c.Type == "id" ||
                c.Type == ClaimTypes.NameIdentifier ||
                c.Type == "UserId" ||
                c.Type == "userId" ||
                c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub
            );

            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var userId))
                return userId;

            return null;
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

        private record CourseProgressInfo(int TotalLessons, int CompletedLessons, bool IsCompleted, bool InProgress, DateTime? CompletedAt);

        public class RatingRequest
        {
            public int Rating { get; set; }
            public string Comment { get; set; }
        }
    }
}
