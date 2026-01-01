using System.IO;

namespace Backend.Helpers
{
    public static class LearningPathStorageHelper
    {
        private const string PublicRootFolderName = "paths";
        private const string PrivateRootFolderName = "paths";
        private const string PrivateBaseFolderName = "storage";

        public static string GetPathsRoot() => Path.Combine(PrivateBaseFolderName, PrivateRootFolderName);

        public static string GetPathFolder(int pathId) => Path.Combine(GetPathsRoot(), $"path-{pathId}");

        public static string GetThumbnailFolder(int pathId) =>
            Path.Combine("wwwroot", PublicRootFolderName, $"path-{pathId}", "thumbnail");
    }
}