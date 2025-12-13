using System.IO;

namespace Backend.Helpers
{
    public static class BookStorageHelper
    {
        private const string RootFolderName = "books";

        public static string GetBooksRoot() => Path.Combine("wwwroot", RootFolderName);

        public static string GetBookFolder(int bookId) => Path.Combine(GetBooksRoot(), $"book-{bookId}");

        public static string GetThumbnailFolder(int bookId) => Path.Combine(GetBookFolder(bookId), "thumbnail");

        public static string GetFilesFolder(int bookId) => Path.Combine(GetBookFolder(bookId), "files");
    }
}