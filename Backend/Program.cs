using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using System.Text;
using System.Linq;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// ============================
//       Services
// ============================

// Controllers + Swagger
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;

    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    // تعريف نظام البيرر (JWT)
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter: Bearer {your token}"
    });

    // جعل كل Endpoints تستخدم نظام المصادقة
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });

    // دعم رفع الملفات عبر FormData
    options.OperationFilter<SwaggerFileOperationFilter>();
});

// DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// CORS للسماح لـ Angular على http://localhost:4200
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularDev", policy =>
    {
        policy
            .WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ============================
//       JWT Authentication
// ============================

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"];
var jwtIssuer = jwtSection["Issuer"];
var jwtAudience = jwtSection["Audience"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("Jwt:Key is not configured in appsettings.json");
}

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = signingKey
        };

        // أعد كتابة رد الـ 401 برسالة أوضح بدل الرد الافتراضي الفارغ
        options.Events = new JwtBearerEvents
        {

            OnMessageReceived = context =>
            {
                if (!string.IsNullOrWhiteSpace(context.Token))
                {
                    return Task.CompletedTask;
                }

                var path = context.HttpContext.Request.Path;
                var isMediaFileRequest =
                    path.StartsWithSegments("/api/lessons/files") ||
                    path.StartsWithSegments("/api/books/files");

                if (!isMediaFileRequest)
                {
                    return Task.CompletedTask;
                }

                if (context.Request.Query.TryGetValue("token", out var tokenValue))
                {
                    context.Token = tokenValue.ToString();
                }

                return Task.CompletedTask;
            },

            OnChallenge = context =>
            {
                context.HandleResponse();

                if (!context.Response.HasStarted)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return context.Response.WriteAsJsonAsync(new
                    {
                        message = "Unauthorized: missing or invalid token. Make sure you are logged in as an admin before calling this endpoint."
                    });
                }

                return Task.CompletedTask;
            }
        };
    });

// ============================
//       Authorization
// ============================

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
    {
        policy.RequireClaim("IsAdmin", "true");
    });
});

var app = builder.Build();

// ============================
//   Seed default Admin (Owner)
// ============================

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    db.Database.Migrate();

    var adminSeedSection = builder.Configuration.GetSection("AdminSeed");
    var seedEnabled = adminSeedSection.GetValue<bool>("Enabled");
    var seedUsername = adminSeedSection["Username"];
    var seedPassword = adminSeedSection["Password"];

    // لو ما في ولا حساب أدمن، ننشئ Owner افتراضي (متحكم به بالبيئة)
    if (seedEnabled && !string.IsNullOrWhiteSpace(seedUsername) && !string.IsNullOrWhiteSpace(seedPassword) && !db.AdminAccounts.Any())
    {
        var owner = new AdminAccount
        {
            Username = seedUsername,
            Role = AdminRole.Owner,
            IsActive = true
        };

        var hasher = new PasswordHasher<AdminAccount>();
        owner.PasswordHash = hasher.HashPassword(owner, seedPassword);

        db.AdminAccounts.Add(owner);
        db.SaveChanges();
    }
}

// ============================
//       Middleware
// ============================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

    var isCourseContent = path.StartsWith("/courses/") && path.Contains("/content/");
    var isBookFile = path.StartsWith("/books/") && path.Contains("/files/");
    var isToolFile = path.StartsWith("/tools/") && path.Contains("/files/");

    if (isCourseContent || isBookFile || isToolFile)
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    await next();
});
// ملفات Angular الـ static (لو حاطط الـ build هنا)
app.UseStaticFiles();

app.UseRouting();

// CORS لازم يكون بعد UseRouting وقبل Auth
app.UseCors("AllowAngularDev");

// مصادقة ثم تفويض
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// لدعم Angular Router لما تستضيف الـ build داخل نفس الباك إند
app.MapFallbackToFile("index.html");

app.Run();
