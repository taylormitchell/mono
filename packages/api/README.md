# REST API

This is a simple REST API for serving and adding files to my notes. Check out the [logging web app](../log-web/README.md) for an example frontend to this API.

## Basic Usage

Get a file:
```bash
curl http://localhost:3077/api/files/path/to/file.md
```

Create or update a file:
```bash
curl -X PUT http://localhost:3077/api/files/path/to/file.md \
  -H "Content-Type: application/json" \
  -d '{"content": "# New File\n\nThis is the content"}'
```

Append to a file:
```bash
curl -X PATCH http://localhost:3077/api/files/path/to/file.md \
  -H "Content-Type: application/json" \
  -d '{"method": "append", "content": "\n\nAppended content"}'
```

Add log entry:
```bash
curl -X POST http://localhost:3077/api/log \
  -H "Content-Type: application/json" \
  -d '{
    "type": "meditated",
    "datetime": "2024-04-15T14:30:00-04:00",
    "duration": "20m",
    "message": "Morning meditation"
  }'
```










