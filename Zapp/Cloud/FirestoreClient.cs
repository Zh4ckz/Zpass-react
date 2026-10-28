using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Zapp.Cloud;

public sealed class FirestoreDocument
{
    public required string Id { get; init; }
    public required Dictionary<string, object?> Fields { get; init; }

    public string GetString(string key) => Fields.TryGetValue(key, out var v) ? v as string ?? "" : "";
    public long GetLong(string key) => Fields.TryGetValue(key, out var v) && v is long l ? l : 0L;
}

/// <summary>
/// Minimal Firestore REST client. Calls go straight to the same Firestore database the mobile
/// app's SDK talks to — the ID token from FirebaseAuthClient is sent as a bearer token, so the
/// exact same security rules apply as on the app.
/// </summary>
public sealed class FirestoreClient(string projectId, Func<CancellationToken, Task<string>> getIdTokenAsync)
{
    private static readonly HttpClient Http = new();
    private readonly string _baseUrl = $"https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents";

    private async Task<HttpRequestMessage> NewRequestAsync(HttpMethod method, string url, CancellationToken ct)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await getIdTokenAsync(ct));
        return request;
    }

    public async Task<FirestoreDocument?> GetDocumentAsync(string path, CancellationToken ct = default)
    {
        using var request = await NewRequestAsync(HttpMethod.Get, $"{_baseUrl}/{path}", ct);
        using var response = await Http.SendAsync(request, ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync(ct);
        return ParseDocument(JsonNode.Parse(json)!.AsObject());
    }

    public async Task<List<FirestoreDocument>> ListDocumentsAsync(string collectionPath, CancellationToken ct = default)
    {
        var results = new List<FirestoreDocument>();
        string? pageToken = null;
        do
        {
            var url = $"{_baseUrl}/{collectionPath}?pageSize=300" + (pageToken is null ? "" : $"&pageToken={pageToken}");
            using var request = await NewRequestAsync(HttpMethod.Get, url, ct);
            using var response = await Http.SendAsync(request, ct);
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) break;
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync(ct);
            var root = JsonNode.Parse(json)!.AsObject();
            if (root["documents"] is JsonArray documents)
                foreach (var doc in documents)
                    results.Add(ParseDocument(doc!.AsObject()));
            pageToken = root["nextPageToken"]?.GetValue<string>();
        } while (pageToken is not null);
        return results;
    }

    /// <summary>Overwrites the document's fields entirely (Firestore Set semantics).</summary>
    public Task SetDocumentAsync(string path, Dictionary<string, object?> fields, CancellationToken ct = default) =>
        WriteAsync(path, fields, updateMask: null, ct);

    /// <summary>Updates only the given top-level fields, leaving the rest of the document untouched.</summary>
    public Task MergeDocumentAsync(string path, Dictionary<string, object?> fields, CancellationToken ct = default) =>
        WriteAsync(path, fields, updateMask: fields.Keys, ct);

    private async Task WriteAsync(string path, Dictionary<string, object?> fields, IEnumerable<string>? updateMask, CancellationToken ct)
    {
        var url = $"{_baseUrl}/{path}";
        if (updateMask is not null)
            url += "?" + string.Join("&", updateMask.Select(f => $"updateMask.fieldPaths={Uri.EscapeDataString(f)}"));

        var body = new JsonObject { ["fields"] = ToFirestoreFields(fields) };
        using var request = await NewRequestAsync(HttpMethod.Patch, url, ct);
        request.Content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json");
        using var response = await Http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task DeleteDocumentAsync(string path, CancellationToken ct = default)
    {
        using var request = await NewRequestAsync(HttpMethod.Delete, $"{_baseUrl}/{path}", ct);
        using var response = await Http.SendAsync(request, ct);
        if (response.StatusCode != System.Net.HttpStatusCode.NotFound)
            response.EnsureSuccessStatusCode();
    }

    private static JsonObject ToFirestoreFields(Dictionary<string, object?> fields)
    {
        var obj = new JsonObject();
        foreach (var (key, value) in fields) obj[key] = ToFirestoreValue(value);
        return obj;
    }

    private static JsonObject ToFirestoreValue(object? value) => value switch
    {
        null => new JsonObject { ["nullValue"] = null },
        string s => new JsonObject { ["stringValue"] = s },
        int i => new JsonObject { ["integerValue"] = i.ToString() },
        long l => new JsonObject { ["integerValue"] = l.ToString() },
        DateTimeOffset dt => new JsonObject { ["timestampValue"] = dt.UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ss.fffffffZ") },
        _ => new JsonObject { ["stringValue"] = value.ToString() }
    };

    private static FirestoreDocument ParseDocument(JsonObject doc)
    {
        var name = doc["name"]!.GetValue<string>();
        var id = name[(name.LastIndexOf('/') + 1)..];
        var fields = new Dictionary<string, object?>();
        if (doc["fields"] is JsonObject fieldsObj)
            foreach (var (key, node) in fieldsObj)
                fields[key] = FromFirestoreValue(node!.AsObject());
        return new FirestoreDocument { Id = id, Fields = fields };
    }

    private static object? FromFirestoreValue(JsonObject value)
    {
        foreach (var (kind, node) in value)
        {
            return kind switch
            {
                "stringValue" => node!.GetValue<string>(),
                "integerValue" => long.Parse(node!.GetValue<string>()),
                "doubleValue" => node!.GetValue<double>(),
                "booleanValue" => node!.GetValue<bool>(),
                "nullValue" => null,
                "timestampValue" => node!.GetValue<string>(),
                _ => node?.ToJsonString()
            };
        }
        return null;
    }
}
