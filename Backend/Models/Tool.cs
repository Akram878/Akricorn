namespace Backend.Models
{
    // أداة / رابط مفيد يعرض في الموقع أو لوحة التحكم
    public class Tool
    {
        public int Id { get; set; }

        public string Name { get; set; }          // اسم الأداة
        public string Description { get; set; }   // وصف قصير
        public string Url { get; set; }           // رابط الأداة (موقع خارجي مثلاً)
        public string Category { get; set; }      // تصنيف (برمجة، دراسة، إنتاجية...)
        public bool IsActive { get; set; } = true;
        public int DisplayOrder { get; set; } = 0; // لترتيب الظهور
    }
}
