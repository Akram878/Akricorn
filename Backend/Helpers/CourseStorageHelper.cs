using System.IO;

namespace Backend.Helpers
{
    public static class CourseStorageHelper
    {
        private const string CourseFolderName = "courses";

        public static string GetCourseRootFolder() => Path.Combine("wwwroot", CourseFolderName);

        public static string GetCourseFolder(int courseId) => Path.Combine(GetCourseRootFolder(), $"course-{courseId}");

        public static string GetThumbnailFolder(int courseId) => Path.Combine(GetCourseFolder(courseId), "thumbnail");

        public static string GetContentFolder(int courseId) => Path.Combine(GetCourseFolder(courseId), "content");

        public static string GetSectionFolder(int courseId, int sectionId) => Path.Combine(GetContentFolder(courseId), $"section-{sectionId}");

        public static string GetLessonFolder(int courseId, int sectionId, int lessonId) => Path.Combine(GetSectionFolder(courseId, sectionId), $"lesson-{lessonId}");
    }
}