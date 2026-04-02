# Files Storage

This directory serves as the local storage for user avatar images, acting as a lightweight substitute for a cloud object storage service (e.g., AWS S3).

## Purpose

When a user uploads a profile picture via `POST /users/avatar`, the file is saved here using the pattern:

```
<userId>.<extension>
```

Example: `550e8400-e29b-41d4-a716-446655440000.png`

## Serving

Files stored here are served as static assets under the `/files` route by `@nestjs/serve-static`.

Example URL: `http://localhost:3000/files/550e8400-e29b-41d4-a716-446655440000.png`

## Supported formats

| Format | Extension        |
| ------ | ---------------- |
| JPEG   | `.jpg` / `.jpeg` |
| PNG    | `.png`           |

Maximum file size: **3 MB**

## Production

In a production environment, this directory should be replaced by a dedicated object storage service such as **AWS S3**, **Google Cloud Storage**, or **Cloudflare R2** to ensure scalability, durability, and CDN delivery.
