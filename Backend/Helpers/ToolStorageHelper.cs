using System.IO;

namespace Backend.Helpers
{
    public static class ToolStorageHelper
    {
      
        private const string PublicRootFolderName = "tools";
        private const string PrivateRootFolderName = "tools";
        private const string PrivateBaseFolderName = "storage";

       
        public static string GetToolsRoot() => Path.Combine(PrivateBaseFolderName, PrivateRootFolderName);

        public static string GetToolFolder(int toolId) => Path.Combine(GetToolsRoot(), $"tool-{toolId}");

      
        public static string GetAvatarFolder(int toolId) =>
            Path.Combine("wwwroot", PublicRootFolderName, $"tool-{toolId}", "avatar");

        public static string GetFilesFolder(int toolId) => Path.Combine(GetToolFolder(toolId), "files");

        public static string GetLegacyFilesFolder(int toolId) =>
            Path.Combine("wwwroot", PublicRootFolderName, $"tool-{toolId}", "files");
    }
}
