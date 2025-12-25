using System.IO;

namespace Backend.Helpers
{
    public static class BookStorageHelper
    {
        private const string PublicRootFolderName = "books";
        private const string PrivateRootFolderName = "books";
        private const string PrivateBaseFolderName = "storage";

        public static string GetBooksRoot() => Path.Combine(PrivateBaseFolderName, PrivateRootFolderName);

        public static string GetBookFolder(int bookId) => Path.Combine(GetBooksRoot(), $"book-{bookId}");

        public static string GetThumbnailFolder(int bookId) =>
            Path.Combine("wwwroot", PublicRootFolderName, $"book-{bookId}", "thumbnail");


        public static string GetFilesFolder(int bookId) => Path.Combine(GetBookFolder(bookId), "files");

        public static string GetLegacyFilesFolder(int bookId) =>
               Path.Combine("wwwroot", PublicRootFolderName, $"book-{bookId}", "files");
    }
}