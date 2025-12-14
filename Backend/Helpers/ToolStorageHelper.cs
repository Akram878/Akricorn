using System.IO;

namespace Backend.Helpers
{
    public static class ToolStorageHelper
    {
        private const string RootFolderName = "tools";

        public static string GetToolsRoot() => Path.Combine("wwwroot", RootFolderName);

        public static string GetToolFolder(int toolId) => Path.Combine(GetToolsRoot(), $"tool-{toolId}");

        public static string GetAvatarFolder(int toolId) => Path.Combine(GetToolFolder(toolId), "avatar");

        public static string GetFilesFolder(int toolId) => Path.Combine(GetToolFolder(toolId), "files");
    }
}