# REST API

This is a simple REST API for serving and adding files to my notes.

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

Add a todo to today's note:
```bash
curl -X POST http://localhost:3077/api/todos/today \
  -H "Content-Type: application/json" \
  -d '{"text": "Write documentation", "status": "TODO"}'
```

Get today's daily note:
```bash
curl http://localhost:3077/api/note/daily
```

Create a new post:
```bash
curl -X POST http://localhost:3077/api/note/post/blog \
  -H "Content-Type: application/json" \
  -d '{"content": "# My New Post\n\nThis is a blog post."}'
```







