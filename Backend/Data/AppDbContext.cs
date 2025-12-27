using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // ========== USERS ==========
        public DbSet<User> Users { get; set; }

        // ========== LMS ==========
        public DbSet<Course> Courses { get; set; }

        // كتب (ما زلنا بحاجة لها)
        public DbSet<Book> Books { get; set; }
        public DbSet<UserBook> UserBooks { get; set; }

        public DbSet<BookFile> BookFiles { get; set; }
        public DbSet<FileMetadata> FileMetadata { get; set; }

        public DbSet<UserCourse> UserCourses { get; set; }

        public DbSet<UserLearningPathCourseProgress> UserLearningPathCourseProgresses { get; set; }

        public DbSet<UserLessonProgress> UserLessonProgresses { get; set; }
        public DbSet<UserPurchase> UserPurchases { get; set; }

        // ========== ADMIN ==========
        public DbSet<AdminAccount> AdminAccounts { get; set; }
        public DbSet<LearningPath> LearningPaths { get; set; }
        public DbSet<LearningPathCourse> LearningPathCourses { get; set; }
        public DbSet<Tool> Tools { get; set; }
        public DbSet<ToolFile> ToolFiles { get; set; }

        public DbSet<Payment> Payments { get; set; }

        // ========== COURSE CONTENT ==========
        public DbSet<CourseSection> CourseSections { get; set; }
        public DbSet<CourseLesson> CourseLessons { get; set; }
        public DbSet<CourseLessonFile> CourseLessonFiles { get; set; }

        public DbSet<CourseRating> CourseRatings { get; set; }
        public DbSet<BookRating> BookRatings { get; set; }
        public DbSet<LearningPathRating> LearningPathRatings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);


            // ==========================================
            // UserCourse (many-to-many: User ↔ Course)
            // ==========================================

            modelBuilder.Entity<Course>()
              .Property(c => c.CreatedAt)
              .HasDefaultValueSql("GETUTCDATE()");

            modelBuilder.Entity<UserCourse>()
                .HasKey(uc => new { uc.UserId, uc.CourseId });

            modelBuilder.Entity<UserCourse>()
                .HasOne(uc => uc.User)
                .WithMany(u => u.UserCourses)
                .HasForeignKey(uc => uc.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserCourse>()
                .HasOne(uc => uc.Course)
               .WithMany(c => c.UserCourses)
                .HasForeignKey(uc => uc.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserCourse>()
                .Property(uc => uc.PurchasedAt)
                .HasDefaultValueSql("GETUTCDATE()");




            modelBuilder.Entity<UserCourse>()
                .Property(uc => uc.CompletedAt)
                .HasColumnType("datetime2");


            // ==========================================
            // UserLearningPathCourseProgress (per-path completion tracking)
            // ==========================================
            modelBuilder.Entity<UserLearningPathCourseProgress>()
                .HasKey(p => new { p.UserId, p.LearningPathId, p.CourseId });

            modelBuilder.Entity<UserLearningPathCourseProgress>()
                .HasOne(p => p.User)
                .WithMany(u => u.LearningPathCourseProgresses)
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserLearningPathCourseProgress>()
                .HasOne(p => p.LearningPath)
                .WithMany()
                .HasForeignKey(p => p.LearningPathId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserLearningPathCourseProgress>()
                .HasOne(p => p.Course)
                .WithMany()
                .HasForeignKey(p => p.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            // ==========================================
            // UserBook (many-to-many: User ↔ Book)
            // ==========================================
            modelBuilder.Entity<UserBook>()
                .HasKey(ub => new { ub.UserId, ub.BookId });

            modelBuilder.Entity<UserBook>()
                .HasOne(ub => ub.User)
                .WithMany(u => u.UserBooks)
                .HasForeignKey(ub => ub.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserBook>()
                .HasOne(ub => ub.Book)
                .WithMany()
                .HasForeignKey(ub => ub.BookId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserBook>()
                .Property(ub => ub.GrantedAt)
                .HasDefaultValueSql("GETUTCDATE()");



            // ==========================================
            // UserLessonProgress
            // ==========================================
            modelBuilder.Entity<UserLessonProgress>()
                .HasKey(ulp => new { ulp.UserId, ulp.LessonId });

            modelBuilder.Entity<UserLessonProgress>()
                .HasOne(ulp => ulp.User)
                .WithMany(u => u.LessonProgresses)
                .HasForeignKey(ulp => ulp.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserLessonProgress>()
                .HasOne(ulp => ulp.Lesson)
                .WithMany()
                .HasForeignKey(ulp => ulp.LessonId)
                .OnDelete(DeleteBehavior.Cascade);

            // ==========================================
            // UserPurchases
            // ==========================================
            modelBuilder.Entity<UserPurchase>()
                .HasOne(up => up.User)
                .WithMany(u => u.Purchases)
                .HasForeignKey(up => up.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserPurchase>()
                .HasOne(up => up.Course)
                .WithMany()
                .HasForeignKey(up => up.CourseId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<UserPurchase>()
                .HasOne(up => up.Book)
                .WithMany()
                .HasForeignKey(up => up.BookId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<UserPurchase>()
                .HasOne(up => up.LearningPath)
                .WithMany()
                .HasForeignKey(up => up.LearningPathId)
                .OnDelete(DeleteBehavior.SetNull);

            // ==========================================
            // Ratings
            // ==========================================
            modelBuilder.Entity<CourseRating>()
                .HasIndex(r => new { r.UserId, r.CourseId })
                .IsUnique();

            modelBuilder.Entity<CourseRating>()
                .HasOne(r => r.User)
                .WithMany(u => u.CourseRatings)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CourseRating>()
                .HasOne(r => r.Course)
                .WithMany(c => c.Ratings)
                .HasForeignKey(r => r.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<BookRating>()
                .HasIndex(r => new { r.UserId, r.BookId })
                .IsUnique();

            modelBuilder.Entity<BookRating>()
                .HasOne(r => r.User)
                .WithMany(u => u.BookRatings)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<BookRating>()
                .HasOne(r => r.Book)
                .WithMany(b => b.Ratings)
                .HasForeignKey(r => r.BookId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<LearningPathRating>()
                .HasIndex(r => new { r.UserId, r.LearningPathId })
                .IsUnique();

            modelBuilder.Entity<LearningPathRating>()
                .HasOne(r => r.User)
                .WithMany(u => u.LearningPathRatings)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<LearningPathRating>()
                .HasOne(r => r.LearningPath)
                .WithMany(lp => lp.Ratings)
                .HasForeignKey(r => r.LearningPathId)
                .OnDelete(DeleteBehavior.Cascade);

            // ==========================================
            // BOOK FILES
            // ==========================================
            modelBuilder.Entity<BookFile>()
                .HasOne(bf => bf.Book)
                .WithMany(b => b.Files)
                .HasForeignKey(bf => bf.BookId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<BookFile>()
               .HasOne(bf => bf.FileMetadata)
               .WithMany()
               .HasForeignKey(bf => bf.FileMetadataId)
               .OnDelete(DeleteBehavior.SetNull);

            // ==========================================
            // TOOL FILES
            // ==========================================
            modelBuilder.Entity<ToolFile>()
                .HasOne(tf => tf.Tool)
                .WithMany(t => t.Files)
                .HasForeignKey(tf => tf.ToolId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<BookFile>()
               .HasOne(bf => bf.FileMetadata)
               .WithMany()
               .HasForeignKey(bf => bf.FileMetadataId)
               .OnDelete(DeleteBehavior.SetNull);

            // ==========================================
            // LearningPathCourse (Course ↔ LearningPath)
            // ==========================================
            modelBuilder.Entity<LearningPathCourse>()
                .HasKey(pc => new { pc.LearningPathId, pc.CourseId });

            modelBuilder.Entity<LearningPathCourse>()
                .HasOne(pc => pc.LearningPath)
                .WithMany(lp => lp.LearningPathCourses)
                .HasForeignKey(pc => pc.LearningPathId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<LearningPathCourse>()
                .HasOne(pc => pc.Course)
                .WithMany(c => c.LearningPathCourses)
                .HasForeignKey(pc => pc.CourseId)
                .OnDelete(DeleteBehavior.Cascade);


            // ==========================================
            // Payments
            // ==========================================
            modelBuilder.Entity<Payment>()
                .HasOne(p => p.User)
                .WithMany()
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);


            // ==========================================
            // COURSE CONTENT NEW SYSTEM
            // ==========================================

            // SECTION → COURSE
            modelBuilder.Entity<CourseSection>()
                .HasOne(s => s.Course)
                .WithMany(c => c.Sections)
                .HasForeignKey(s => s.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            // LESSON → SECTION
            modelBuilder.Entity<CourseLesson>()
                .HasOne(l => l.Section)
                .WithMany(s => s.Lessons)
                .HasForeignKey(l => l.SectionId)
                .OnDelete(DeleteBehavior.Cascade);

            // FILE → LESSON
            modelBuilder.Entity<CourseLessonFile>()
                .HasOne(f => f.Lesson)
                .WithMany(l => l.Files)
                .HasForeignKey(f => f.LessonId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CourseLessonFile>()
              .HasOne(f => f.FileMetadata)
              .WithMany()
              .HasForeignKey(f => f.FileMetadataId)
              .OnDelete(DeleteBehavior.SetNull);

            // ========== DONE ==========
        }
    }
}
