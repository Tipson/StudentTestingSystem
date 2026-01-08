using Assessment.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Npgsql;

var builder = Host.CreateApplicationBuilder(args);

var cs = builder.Configuration.GetConnectionString("Default")
         ?? Environment.GetEnvironmentVariable("DB_CONNECTION");

if (string.IsNullOrWhiteSpace(cs))
    throw new Exception("Задайте подключение через ConnectionStrings:Default или DB_CONNECTION.");

builder.Services.AddDbContext<AssessmentDbContext>(o => o.UseNpgsql(cs));

using var host = builder.Build();
using var scope = host.Services.CreateScope();

var db = scope.ServiceProvider.GetRequiredService<AssessmentDbContext>();

await using var conn = new NpgsqlConnection(cs);
await conn.OpenAsync();

const string lockKey = "assessment-migrations";

await using (var lockCmd = new NpgsqlCommand("SELECT pg_advisory_lock(hashtext(@k));", conn))
{
    lockCmd.Parameters.AddWithValue("k", lockKey);
    await lockCmd.ExecuteNonQueryAsync();
}

try
{
    await db.Database.MigrateAsync();
    Console.WriteLine("Assessment миграция выполнена.");
}
finally
{
    await using var unlockCmd = new NpgsqlCommand("SELECT pg_advisory_unlock(hashtext(@k));", conn);
    unlockCmd.Parameters.AddWithValue("k", lockKey);
    await unlockCmd.ExecuteNonQueryAsync();
}