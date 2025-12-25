using System.IO;

namespace Backend.Helpers
{
    public static class CourseStorageHelper
    {
     
        private const string PublicCourseFolderName = "courses";
        private const string PrivateCourseFolderName = "courses";
        private const string PrivateRootFolderName = "storage";

      
        public static string GetCourseRootFolder() => Path.Combine(PrivateRootFolderName, PrivateCourseFolderName);

        public static string GetCourseFolder(int courseId) => Path.Combine(GetCourseRootFolder(), $"course-{courseId}");

      
        public static string GetThumbnailFolder(int courseId) =>
            Path.Combine("wwwroot", PublicCourseFolderName, $"course-{courseId}", "thumbnail");

        public static string GetContentFolder(int courseId) => Path.Combine(GetCourseFolder(courseId), "content");

        public static string GetSectionFolder(int courseId, int sectionId) => Path.Combine(GetContentFolder(courseId), $"section-{sectionId}");

        public static string GetLessonFolder(int courseId, int sectionId, int lessonId) => Path.Combine(GetSectionFolder(courseId, sectionId), $"lesson-{lessonId}");

        public static string GetLegacyCourseRootFolder() => Path.Combine("wwwroot", PublicCourseFolderName);

        public static string GetLegacyContentFolder(int courseId) =>
            Path.Combine(GetLegacyCourseRootFolder(), $"course-{courseId}", "content");
    }
}
