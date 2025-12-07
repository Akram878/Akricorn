using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }

        // 🆕 LMS
        public DbSet<Course> Courses { get; set; }
        public DbSet<Book> Books { get; set; }
        public DbSet<CourseBook> CourseBooks { get; set; }
        public DbSet<UserCourse> UserCourses { get; set; }
        public DbSet<UserBook> UserBooks { get; set; }
        // 🆕 Admin dashboard accounts
        public DbSet<AdminAccount> AdminAccounts { get; set; }

        // 🆕 Learning Paths
        public DbSet<LearningPath> LearningPaths { get; set; }
        public DbSet<LearningPathCourse> LearningPathCourses { get; set; }

        // 🆕 Tools
        public DbSet<Tool> Tools { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // مفتاح مركب للـ CourseBook (Many-to-Many)
            modelBuilder.Entity<CourseBook>()
                .HasKey(cb => new { cb.CourseId, cb.BookId });

            modelBuilder.Entity<CourseBook>()
                .HasOne(cb => cb.Course)
                .WithMany(c => c.CourseBooks)
                .HasForeignKey(cb => cb.CourseId);

            modelBuilder.Entity<CourseBook>()
                .HasOne(cb => cb.Book)
                .WithMany()
                .HasForeignKey(cb => cb.BookId);

            // ممكن تضيف seed بسيطة لاحقاً هنا لو حبيت

            // Many-to-Many: LearningPath ↔ Course
            modelBuilder.Entity<LearningPathCourse>()
                .HasKey(pc => new { pc.LearningPathId, pc.CourseId });

            modelBuilder.Entity<LearningPathCourse>()
                .HasOne(pc => pc.LearningPath)
                .WithMany(lp => lp.LearningPathCourses)
                .HasForeignKey(pc => pc.LearningPathId);

            modelBuilder.Entity<LearningPathCourse>()
                .HasOne(pc => pc.Course)
                .WithMany()
                .HasForeignKey(pc => pc.CourseId);
        }
    }
}
