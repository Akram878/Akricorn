using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.IdentityModel.Tokens.Jwt;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/payments")]
    [Authorize]
    public class PaymentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PaymentsController(AppDbContext context)
        {
            _context = context;
        }

        // ==============================
        //   شراء كورس + تسجيل عملية دفع
        // ==============================
        [HttpPost("course/{courseId}")]
        public async Task<IActionResult> PurchaseCourseWithPayment(int courseId)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            // تأكد أن المستخدم موجود ومفعّل
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);
            if (user == null)
                return Unauthorized(new { message = "Unauthorized." });

            if (!user.IsActive)
                return StatusCode(403, new { message = "Your account has been disabled." });

            // تأكد أن الكورس موجود ومفعل
            var course = await _context.Courses
                .FirstOrDefaultAsync(c => c.Id == courseId && c.IsActive);

            if (course == null)
                return NotFound(new { message = "Course not found." });

            // هل المستخدم يملك الكورس أصلاً؟
            var alreadyHasCourse = await _context.UserCourses
                .AnyAsync(uc => uc.UserId == userId.Value && uc.CourseId == courseId);

            if (alreadyHasCourse)
                return BadRequest(new { message = "You already own this course." });

            // 🔹 دفع افتراضي ناجح (بدون بوابة دفع حقيقية)
            var payment = new Payment
            {
                UserId = userId.Value,
                Amount = course.Price,
                Currency = "USD",
                Status = PaymentStatus.Succeeded,
                TargetType = "Course",
                TargetId = course.Id,
                Description = $"Purchase course: {course.Title}",
                Provider = "DemoPay",
                ExternalReference = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow
            };

            _context.Payments.Add(payment);

            // إضافة الكورس للمستخدم (My Courses)
            var userCourse = new UserCourse
            {
                UserId = userId.Value,
                CourseId = course.Id,
                PurchasedAt = DateTime.UtcNow
            };

            _context.UserCourses.Add(userCourse);

            var hasPurchase = await _context.UserPurchases
                .AnyAsync(up => up.UserId == userId.Value &&
                                up.PurchaseType == PurchaseType.Course &&
                                up.CourseId == course.Id);

            if (!hasPurchase)
            {
                var userPurchase = new UserPurchase
                {
                    UserId = userId.Value,
                    PurchaseType = PurchaseType.Course,
                    CourseId = course.Id,
                    PurchasedAt = DateTime.UtcNow
                };

                _context.UserPurchases.Add(userPurchase);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Course purchased successfully.",
                paymentId = payment.Id,
                courseId = course.Id,
                courseTitle = course.Title,
                amount = payment.Amount,
                currency = payment.Currency,
                provider = payment.Provider
            });
        }

        // ==============================
        //   سجل المدفوعات الخاص بالمستخدم
        // ==============================
        [HttpGet("my")]
        public async Task<IActionResult> GetMyPayments()
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized(new { message = "Unauthorized." });

            try
            {
                var payments = await _context.Payments
                    .Where(p => p.UserId == userId.Value)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => new
                    {
                        p.Id,
                        p.Amount,
                        p.Currency,
                        Status = p.Status.ToString(),
                        p.TargetType,
                        p.TargetId,
                        p.Description,
                        p.Provider,
                        p.ExternalReference,
                        p.CreatedAt,
                        p.CompletedAt
                    })
                    .ToListAsync();

                return Ok(payments);
            }
            catch (Exception ex)
            {
                Console.WriteLine("GetMyPayments error: " + ex.Message);
                return Ok(Array.Empty<object>());
            }
        }

        // ==============================
        //          Helpers
        // ==============================
        private int? GetCurrentUserId()
        {
            var userIdClaim = User.Claims.FirstOrDefault(c =>
                c.Type == ClaimTypes.NameIdentifier ||
                c.Type == "sub" ||
                c.Type == "id" ||
                c.Type == "UserId" ||
                c.Type == "userId" ||
                c.Type == JwtRegisteredClaimNames.Sub
            );

            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var userId))
                return userId;

            return null;
        }
    }
}
