using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;


namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("signup")]
        public async Task<IActionResult> SignUp([FromBody] User user)
        {
            if (user == null)
                return BadRequest("Invalid user data");

            // تحقق من عدم وجود المستخدم مسبقًا
            var existingUser = _context.Users.FirstOrDefault(u => u.Email == user.Email);
            if (existingUser != null)
                return BadRequest("User already exists");

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User registered successfully" });
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] UserLoginRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                return BadRequest(new { message = "Email or password missing" });

            var existingUser = _context.Users
                .FirstOrDefault(u => u.Email == request.Email && u.Password == request.Password);

            if (existingUser == null)
                return BadRequest(new { message = "Invalid email or password" });

            return Ok(new { message = "Login successful", userId = existingUser.Id });
        }

    }
}
