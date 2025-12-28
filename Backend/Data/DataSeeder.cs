using System;
using System.IO;
using System.Text;
using Backend.Helpers;
using Backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class DataSeeder
    {
        private readonly AppDbContext _db;
        private readonly PasswordHasher<User> _passwordHasher;

        public DataSeeder(AppDbContext db, PasswordHasher<User> passwordHasher)
        {
            _db = db;
            _passwordHasher = passwordHasher;
        }

        public async Task SeedAsync(CancellationToken cancellationToken = default)
        {
            if (!await _db.Database.CanConnectAsync(cancellationToken))
            {
                return;
            }

            await SeedUsersAsync(cancellationToken);
            await SeedCourseAsync(cancellationToken);
        }

        private async Task SeedUsersAsync(CancellationToken cancellationToken)
        {
            if (await _db.Users.AnyAsync(cancellationToken))
            {
                return;
            }

            var firstUser = CreateUser("Alice", "Anderson", "alice@example.com", "+1", "5550001", "Seattle");
            var secondUser = CreateUser("Bob", "Baker", "bob@example.com", "+1", "5550002", "Seattle");

            _db.Users.AddRange(firstUser, secondUser);
            await _db.SaveChangesAsync(cancellationToken);
        }

        private User CreateUser(string name, string family, string email, string countryCode, string number, string city)
        {
            var user = new User
            {
                Name = name,
                Family = family,
                Email = email,
                CountryCode = countryCode,
                Number = number,
                City = city,
                CanEditBirthDate = true,
                Role = "User",
                IsActive = true
            };

            user.PasswordHash = _passwordHasher.HashPassword(user, "User@123");
            return user;
        }

        private async Task SeedCourseAsync(CancellationToken cancellationToken)
        {
            if (await _db.Courses.AnyAsync(cancellationToken) ||
                await _db.CourseSections.AnyAsync(cancellationToken) ||
                await _db.CourseLessons.AnyAsync(cancellationToken))
            {
                return;
            }

            var course = new Course
            {
                Title = "Getting Started with LMS",
                Description = "Seed course for initial setup.",
                Price = 0,
                Discount = 0,
                IsActive = true,
                Hours = 1,
                Category = "General",
                Rating = 0,
                TotalSections = 1,
                TotalLessons = 2,
                ThumbnailUrl = string.Empty
            };

            var section = new CourseSection
            {
                Title = "Introduction",
                Order = 1,
                Course = course
            };

            var lesson1 = new CourseLesson
            {
                Title = "Welcome",
                Order = 1,
                Section = section
            };

            var lesson2 = new CourseLesson
            {
                Title = "First Steps",
                Order = 2,
                Section = section
            };

            section.Lessons.Add(lesson1);
            section.Lessons.Add(lesson2);
            course.Sections.Add(section);

            _db.Courses.Add(course);
            await _db.SaveChangesAsync(cancellationToken);

            await SeedLessonFileAsync(lesson1, cancellationToken);
            await SeedLessonFileAsync(lesson2, cancellationToken);

            await _db.SaveChangesAsync(cancellationToken);
        }

        private async Task SeedLessonFileAsync(CourseLesson lesson, CancellationToken cancellationToken)
        {
            if (await _db.CourseLessonFiles.AnyAsync(f => f.LessonId == lesson.Id, cancellationToken))
            {
                return;
            }

            var storedName = $"{Guid.NewGuid():N}.txt";
            var content = $"Seed content for {lesson.Title}";
            var bytes = Encoding.UTF8.GetBytes(content);

            var metadata = new FileMetadata
            {
                OriginalName = $"{lesson.Title.Replace(" ", "-").ToLowerInvariant()}.txt",
                StoredName = storedName,
                Size = bytes.LongLength,
                MimeType = "text/plain",
                Extension = ".txt",
                OwnerEntityType = nameof(CourseLesson),
                OwnerEntityId = lesson.Id,
                UploadedAt = DateTime.UtcNow
            };

            var file = new CourseLessonFile
            {
                LessonId = lesson.Id,
                FileName = metadata.OriginalName,
                FileUrl = metadata.StoredName,
                SizeBytes = metadata.Size,
                ContentType = metadata.MimeType,
                FileMetadata = metadata,
                UploadedAt = DateTime.UtcNow
            };

            _db.FileMetadata.Add(metadata);
            _db.CourseLessonFiles.Add(file);

            var lessonFolder = CourseStorageHelper.GetLessonFolder(lesson.Section.CourseId, lesson.Section.Id, lesson.Id);
            Directory.CreateDirectory(lessonFolder);
            var physicalPath = Path.Combine(lessonFolder, storedName);

            if (!File.Exists(physicalPath))
            {
                await File.WriteAllBytesAsync(physicalPath, bytes, cancellationToken);
            }
        }
    }
}
