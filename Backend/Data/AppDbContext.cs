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

        public DbSet<UserCourse> UserCourses { get; set; }

        // ========== ADMIN ==========
        public DbSet<AdminAccount> AdminAccounts { get; set; }
        public DbSet<LearningPath> LearningPaths { get; set; }
        public DbSet<LearningPathCourse> LearningPathCourses { get; set; }
        public DbSet<Tool> Tools { get; set; }

        public DbSet<Payment> Payments { get; set; }

        // ========== COURSE CONTENT ==========
        public DbSet<CourseSection> CourseSections { get; set; }
        public DbSet<CourseLesson> CourseLessons { get; set; }
        public DbSet<CourseLessonFile> CourseLessonFiles { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);


            // ==========================================
            // UserCourse (many-to-many: User ↔ Course)
            // ==========================================
            modelBuilder.Entity<UserCourse>()
                .HasKey(uc => new { uc.UserId, uc.CourseId });

            modelBuilder.Entity<UserCourse>()
                .HasOne(uc => uc.User)
                .WithMany(u => u.UserCourses)
                .HasForeignKey(uc => uc.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserCourse>()
                .HasOne(uc => uc.Course)
                .WithMany()
                .HasForeignKey(uc => uc.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserCourse>()
                .Property(uc => uc.PurchasedAt)
                .HasDefaultValueSql("GETUTCDATE()");


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
            // BOOK FILES
            // ==========================================
            modelBuilder.Entity<BookFile>()
                .HasOne(bf => bf.Book)
                .WithMany(b => b.Files)
                .HasForeignKey(bf => bf.BookId)
                .OnDelete(DeleteBehavior.Cascade);



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

            // ========== DONE ==========
        }
    }
}
