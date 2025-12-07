using System;
using System.Collections.Generic;

namespace Backend.Models
{
    public class LearningPath
    {
        public int Id { get; set; }

        public string Title { get; set; }        // اسم المسار
        public string Description { get; set; }  // وصف المسار
        public bool IsActive { get; set; } = true;

        public int DisplayOrder { get; set; }    // لترتيب المسارات في الواجهة
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // الكورسات المرتبطة بهذا المسار
        public ICollection<LearningPathCourse> LearningPathCourses { get; set; }
    }
}
