# builtbyzero-site

The landing page for [builtbyzero.com](https://builtbyzero.com).

Static HTML, deployed to Cloudflare Pages.

## Structure

```
public/         # static files served as the site root
  index.html    # home
  about.html    # /about
```

## Deploy

Pushes to `main` auto-deploy via GitHub Actions (`.github/workflows/deploy.yml`).
