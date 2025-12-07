namespace Backend.Models
{
    public class Book
    {
        public int Id { get; set; }

        public string Title { get; set; }        // اسم الكتاب
        public string Description { get; set; }  // وصف
        public decimal Price { get; set; }       // سعر الكتاب لو اشتريناه لوحده
        public string FileUrl { get; set; }      // رابط الكتاب (PDF مثلاً)
        public bool IsActive { get; set; } = true;

        // لاحقاً ممكن نضيف نوع الكتاب أو كاتيجوري الخ...
    }
}
