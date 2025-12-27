using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;

namespace Backend.Helpers
{
    public static class FileValidationHelper
    {
        private static readonly string[] BookExtensions = { ".pdf" };
        private static readonly string[] CourseExtensions = { ".pdf", ".mp4", ".mov", ".avi", ".mkv", ".webm", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg" };
        private static readonly string[] ToolExtensions = { ".zip", ".exe" };
        private static readonly string[] IconExtensions = { ".png", ".svg", ".jpg", ".jpeg", ".gif", ".bmp" };

        public static bool ValidateBookFile(IFormFile file, out string error)
        {
            return ValidateByExtension(file, BookExtensions, "Only PDF files are allowed for books.", out error);
        }

        public static bool ValidateCourseFile(IFormFile file, out string error)
        {
            return ValidateByExtension(file, CourseExtensions, "Only PDF, video, or image files are allowed for lessons.", out error);
        }

        public static bool ValidateToolFile(IFormFile file, out string error)
        {
            return ValidateByExtension(file, ToolExtensions, "Only ZIP or EXE files are allowed for tools.", out error);
        }

        public static bool ValidateIconFile(IFormFile file, out string error)
        {
            if (!ValidateByExtension(file, IconExtensions, "Only PNG, SVG, or image files are allowed for icons.", out error))
                return false;

            if (!TryGetImageDimensions(file, out var width, out var height))
            {
                error = "Unable to determine image dimensions.";
                return false;
            }

            if (width > 50 || height > 50)
            {
                error = "Icon dimensions must be at most 50x50 pixels.";
                return false;
            }

            error = string.Empty;
            return true;
        }

        private static bool ValidateByExtension(IFormFile file, string[] allowedExtensions, string message, out string error)
        {
            var extension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(extension) || !allowedExtensions.Contains(extension))
            {
                error = message;
                return false;
            }

            error = string.Empty;
            return true;
        }

        private static bool TryGetImageDimensions(IFormFile file, out int width, out int height)
        {
            width = 0;
            height = 0;

            var extension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(extension))
                return false;

            using var stream = file.OpenReadStream();

            if (extension == ".svg")
            {
                using var reader = new StreamReader(stream);
                var content = reader.ReadToEnd();
                return TryParseSvgDimensions(content, out width, out height);
            }

            if (extension == ".png")
                return TryReadPngDimensions(stream, out width, out height);

            if (extension == ".gif")
                return TryReadGifDimensions(stream, out width, out height);

            if (extension == ".jpg" || extension == ".jpeg")
                return TryReadJpegDimensions(stream, out width, out height);

            if (extension == ".bmp")
                return TryReadBmpDimensions(stream, out width, out height);

            return false;
        }

        private static bool TryParseSvgDimensions(string content, out int width, out int height)
        {
            width = 0;
            height = 0;

            var widthMatch = Regex.Match(content, @"\bwidth\s*=\s*""([^""]+)""", RegexOptions.IgnoreCase);
            var heightMatch = Regex.Match(content, @"\bheight\s*=\s*""([^""]+)""", RegexOptions.IgnoreCase);

            if (widthMatch.Success && heightMatch.Success &&
                TryParseSvgLength(widthMatch.Groups[1].Value, out width) &&
                TryParseSvgLength(heightMatch.Groups[1].Value, out height))
            {
                return true;
            }

            var viewBoxMatch = Regex.Match(content, @"\bviewBox\s*=\s*""([^""]+)""", RegexOptions.IgnoreCase);
            if (!viewBoxMatch.Success)
                return false;

            var parts = viewBoxMatch.Groups[1].Value
                .Split(new[] { ' ', ',' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 4)
                return false;

            if (!float.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out var vbWidth))
                return false;
            if (!float.TryParse(parts[3], NumberStyles.Float, CultureInfo.InvariantCulture, out var vbHeight))
                return false;

            width = (int)Math.Round(vbWidth);
            height = (int)Math.Round(vbHeight);
            return true;
        }

        private static bool TryParseSvgLength(string value, out int size)
        {
            size = 0;
            var cleaned = Regex.Replace(value, "[a-zA-Z%]+", string.Empty);
            if (!float.TryParse(cleaned, NumberStyles.Float, CultureInfo.InvariantCulture, out var floatValue))
                return false;

            size = (int)Math.Round(floatValue);
            return true;
        }

        private static bool TryReadPngDimensions(Stream stream, out int width, out int height)
        {
            width = 0;
            height = 0;
            Span<byte> header = stackalloc byte[24];
            if (stream.Read(header) != 24)
                return false;

            width = ReadBigEndianInt(header.Slice(16, 4));
            height = ReadBigEndianInt(header.Slice(20, 4));
            return width > 0 && height > 0;
        }

        private static bool TryReadGifDimensions(Stream stream, out int width, out int height)
        {
            width = 0;
            height = 0;
            Span<byte> header = stackalloc byte[10];
            if (stream.Read(header) != 10)
                return false;

            width = header[6] | (header[7] << 8);
            height = header[8] | (header[9] << 8);
            return width > 0 && height > 0;
        }

        private static bool TryReadBmpDimensions(Stream stream, out int width, out int height)
        {
            width = 0;
            height = 0;
            Span<byte> header = stackalloc byte[26];
            if (stream.Read(header) != 26)
                return false;

            width = BitConverter.ToInt32(header.Slice(18, 4));
            height = BitConverter.ToInt32(header.Slice(22, 4));
            return width > 0 && height > 0;
        }

        private static bool TryReadJpegDimensions(Stream stream, out int width, out int height)
        {
            width = 0;
            height = 0;

            Span<byte> buffer = stackalloc byte[2];
            if (stream.Read(buffer) != 2 || buffer[0] != 0xFF || buffer[1] != 0xD8)
                return false;

            while (stream.Position < stream.Length)
            {
                if (stream.Read(buffer) != 2)
                    return false;

                if (buffer[0] != 0xFF)
                    return false;

                var marker = buffer[1];
                if (marker == 0xD9 || marker == 0xDA)
                    break;

                Span<byte> sizeBuffer = stackalloc byte[2];
                if (stream.Read(sizeBuffer) != 2)
                    return false;

                var segmentLength = (sizeBuffer[0] << 8) + sizeBuffer[1];
                if (segmentLength < 2)
                    return false;

                if (marker >= 0xC0 && marker <= 0xC3)
                {
                    stream.ReadByte();
                    if (stream.Read(sizeBuffer) != 2)
                        return false;

                    height = (sizeBuffer[0] << 8) + sizeBuffer[1];
                    if (stream.Read(sizeBuffer) != 2)
                        return false;

                    width = (sizeBuffer[0] << 8) + sizeBuffer[1];
                    return width > 0 && height > 0;
                }

                stream.Seek(segmentLength - 2, SeekOrigin.Current);
            }

            return false;
        }

        private static int ReadBigEndianInt(ReadOnlySpan<byte> buffer)
        {
            return (buffer[0] << 24) | (buffer[1] << 16) | (buffer[2] << 8) | buffer[3];
        }
    }
}