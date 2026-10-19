declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    WORKSPACE_OWNER_EMAIL?: string;
  }
}
