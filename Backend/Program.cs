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
    // Define the bearer system (JWT)
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter: Bearer {your token}"
    });

    // Make all endpoints use authentication
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

    // Support file uploads via FormData
    options.OperationFilter<SwaggerFileOperationFilter>();
});

// DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<AdminSeeder>();
builder.Services.AddScoped<PasswordHasher<AdminAccount>>();

builder.Services.AddScoped<PasswordHasher<User>>();
// CORS to allow Angular on http://localhost:4200
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
            IssuerSigningKey = signingKey,
            ClockSkew = TimeSpan.Zero
        };

        // Rewrite the 401 response with a clearer message instead of the empty default
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

            OnTokenValidated = context =>
            {
                Console.WriteLine("ADMIN TOKEN VALIDATED");
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
                        message = "Unauthorized."
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

    var adminSeeder = scope.ServiceProvider.GetRequiredService<AdminSeeder>();
    await adminSeeder.SeedAsync();

   
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
// Angular static files (if hosting the build here)
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        var origin = context.Context.Request.Headers.Origin.ToString();
        if (origin == "http://localhost:4200")
        {
            context.Context.Response.Headers["Access-Control-Allow-Origin"] = origin;
            context.Context.Response.Headers["Vary"] = "Origin";
        }
    }
});

app.UseRouting();

// CORS must be after UseRouting and before Auth
app.UseCors("AllowAngularDev");

// Authenticate then authorize
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// To support Angular Router when hosting the build inside the same backend
app.MapFallbackToFile("index.html");

app.Run();
