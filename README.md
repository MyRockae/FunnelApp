# Rockae Funnel App

Static HTML/CSS sales funnel for [sales.rockae.com](https://sales.rockae.com).

## Deploy

Pushes to `main` deploy via FTP to Hostinger:

`/home/u175293752/domains/rockae.com/public_html/funnel_app`

### One-time GitHub secrets

In the repo: **Settings → Secrets and variables → Actions**, add the same FTP secrets used by Admin.WebApp:

| Secret         | Value                                      |
|----------------|--------------------------------------------|
| `FTP_SERVER`   | Hostinger FTP host only (no `ftp://`)      |
| `FTP_USERNAME` | Main FTP user (home contains `domains/`)   |
| `FTP_PASSWORD` | Main FTP password                          |

### Hostinger subdomain

Point **sales.rockae.com** document root to:

`domains/rockae.com/public_html/funnel_app`

(or the equivalent path Hostinger shows for that folder).

## Local preview

Open `index.html` in a browser, or serve the folder with any static server.
