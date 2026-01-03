using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Backend.Controllers;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Backend.Tests
{
    public class AuthControllerTests
    {
        [Fact]
        public async Task Signup_EmptyFields_AreRejected()
        {
            // This test checks that empty registration fields return validation errors.
            using var context = BuildDbContext();
            var controller = BuildController(context);

            var request = new SignupRequest();

            var result = await controller.Signup(request);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var errors = GetErrors(badRequest);

            Assert.Contains("name", errors.Keys);
            Assert.Contains("family", errors.Keys);
            Assert.Contains("email", errors.Keys);
            Assert.Contains("password", errors.Keys);
            Assert.Contains("confirmPassword", errors.Keys);
            Assert.Contains("number", errors.Keys);
            Assert.Contains("city", errors.Keys);
            Assert.Contains("birthDate", errors.Keys);
            Assert.Contains("countryCode", errors.Keys);
            Assert.Contains("acceptedPolicy", errors.Keys);
        }

        [Fact]
        public async Task Signup_InvalidEmail_IsRejected()
        {
            // This test checks that an invalid email fails validation.
            using var context = BuildDbContext();
            var controller = BuildController(context);

            var request = BuildValidSignupRequest();
            request.Email = "invalid-email";

            var result = await controller.Signup(request);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var errors = GetErrors(badRequest);

            Assert.Contains("email", errors.Keys);
        }

        [Fact]
        public async Task Signup_PasswordRules_AreEnforced()
        {
            // This test checks that the password rules are enforced.
            using var context = BuildDbContext();
            var controller = BuildController(context);

            var request = BuildValidSignupRequest();
            request.Password = "password";
            request.ConfirmPassword = "password";

            var result = await controller.Signup(request);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var errors = GetErrors(badRequest);

            Assert.Contains("password", errors.Keys);
        }

        [Fact]
        public async Task Signup_PhoneNumberRegex_IsEnforced()
        {
            // This test checks that the phone number regex rejects invalid input.
            using var context = BuildDbContext();
            var controller = BuildController(context);

            var request = BuildValidSignupRequest();
            request.Number = "12-ABC";

            var result = await controller.Signup(request);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var errors = GetErrors(badRequest);

            Assert.Contains("number", errors.Keys);
        }

        [Fact]
        public async Task Login_InvalidEmailFormat_IsRejected()
        {
            // This test checks that an invalid email format is rejected on login.
            using var context = BuildDbContext();
            var controller = BuildController(context);

            var result = await controller.Login(new LoginRequest
            {
                Email = "invalid-email",
                Password = "Password1!"
            });

            Assert.IsType<BadRequestObjectResult>(result.Result);
        }

        [Fact]
        public async Task Login_EmptyPassword_IsRejected()
        {
            // This test checks that an empty password is rejected on login.
            using var context = BuildDbContext();
            var controller = BuildController(context);

            var result = await controller.Login(new LoginRequest
            {
                Email = "user@example.com",
                Password = ""
            });

            Assert.IsType<BadRequestObjectResult>(result.Result);
        }

        [Fact]
        public async Task Signup_CreatesUserInDatabase()
        {
            // This test checks that a valid registration creates a user record.
            using var context = BuildDbContext();
            var controller = BuildController(context);

            var request = BuildValidSignupRequest();

            var result = await controller.Signup(request);

            Assert.IsType<OkObjectResult>(result.Result);
            Assert.Equal(1, await context.Users.CountAsync());
        }

        [Fact]
        public async Task Signup_DuplicateEmail_IsRejected()
        {
            // This test checks that duplicate email registration is rejected.
            using var context = BuildDbContext();
            var controller = BuildController(context);

            var existingUser = new User
            {
                Name = "Jane",
                Family = "Doe",
                Email = "duplicate@example.com",
                City = "Boston",
                CountryCode = "+1",
                Number = "1234567890",
                IsActive = true
            };
            existingUser.PasswordHash = new PasswordHasher<User>().HashPassword(existingUser, "Password1!");
            context.Users.Add(existingUser);
            await context.SaveChangesAsync();

            var request = BuildValidSignupRequest();
            request.Email = "duplicate@example.com";

            var result = await controller.Signup(request);

            Assert.IsType<BadRequestObjectResult>(result.Result);
        }

        [Fact]
        public async Task Login_CorrectCredentials_Succeed()
        {
            // This test checks that correct credentials allow login.
            using var context = BuildDbContext();
            var controller = BuildController(context);

            var user = new User
            {
                Name = "Login",
                Family = "User",
                Email = "login@example.com",
                City = "Austin",
                CountryCode = "+1",
                Number = "1234567890",
                IsActive = true
            };
            user.PasswordHash = new PasswordHasher<User>().HashPassword(user, "Password1!");
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var result = await controller.Login(new LoginRequest
            {
                Email = "login@example.com",
                Password = "Password1!"
            });

            Assert.IsType<OkObjectResult>(result.Result);
        }

        [Fact]
        public async Task Login_IncorrectPassword_Fails()
        {
            // This test checks that an incorrect password is rejected.
            using var context = BuildDbContext();
            var controller = BuildController(context);

            var user = new User
            {
                Name = "Login",
                Family = "User",
                Email = "wrongpass@example.com",
                City = "Austin",
                CountryCode = "+1",
                Number = "1234567890",
                IsActive = true
            };
            user.PasswordHash = new PasswordHasher<User>().HashPassword(user, "Password1!");
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var result = await controller.Login(new LoginRequest
            {
                Email = "wrongpass@example.com",
                Password = "WrongPassword!"
            });

            Assert.IsType<UnauthorizedObjectResult>(result.Result);
        }

        [Fact]
        public async Task DeleteAccount_RemovesUser()
        {
            // This test checks that deleting an account removes the user record.
            using var context = BuildDbContext();
            var controller = BuildController(context);

            var user = new User
            {
                Name = "Delete",
                Family = "Me",
                Email = "delete@example.com",
                City = "Seattle",
                CountryCode = "+1",
                Number = "1234567890",
                IsActive = true
            };
            user.PasswordHash = new PasswordHasher<User>().HashPassword(user, "Password1!");
            context.Users.Add(user);
            await context.SaveChangesAsync();

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
                    }))
                }
            };

            var result = await controller.DeleteAccount(new DeleteAccountRequest
            {
                CurrentPassword = "Password1!"
            });

            Assert.IsType<OkObjectResult>(result);
            Assert.Equal(0, await context.Users.CountAsync());
        }

        [Fact]
        public async Task Signup_UserCount_IncreasesAfterRegistration()
        {
            // This test checks a simple numeric behavior: user count increases after signup.
            using var context = BuildDbContext();
            var controller = BuildController(context);

            Assert.Equal(0, await context.Users.CountAsync());

            await controller.Signup(BuildValidSignupRequest());

            Assert.Equal(1, await context.Users.CountAsync());
        }

        private static AppDbContext BuildDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        private static AuthController BuildController(AppDbContext context)
        {
            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:Key"] = "supersecretkeysupersecretkey",
                    ["Jwt:Issuer"] = "test-issuer",
                    ["Jwt:Audience"] = "test-audience"
                })
                .Build();

            return new AuthController(context, configuration);
        }

        private static SignupRequest BuildValidSignupRequest()
        {
            return new SignupRequest
            {
                Name = "John",
                Family = "Smith",
                Email = "student@example.com",
                Password = "Password1!",
                ConfirmPassword = "Password1!",
                City = "Chicago",
                CountryCode = "+1",
                Number = "1234567890",
                BirthDate = DateTime.UtcNow.AddYears(-20),
                AcceptedPolicy = true
            };
        }

        private static Dictionary<string, string> GetErrors(BadRequestObjectResult result)
        {
            var errorsProperty = result.Value?.GetType().GetProperty("errors");
            var errors = errorsProperty?.GetValue(result.Value) as Dictionary<string, string>;
            return errors ?? new Dictionary<string, string>();
        }
    }
}