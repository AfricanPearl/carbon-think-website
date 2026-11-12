# Carbon Think website

The public website for **carbon-think.org**, with a built-in admin portal at `/admin` for editing all content and images without touching code.

- No dependencies: plain Node.js 18 or newer.
- Text, emails and image choices are stored in `content.json` inside the data folder.
- Uploaded images go in `uploads/`, and contact form messages in `messages.json`.
- A copy of the previous version is kept on every publish, so any change can be undone.

## Run it on your computer

```bash
ADMIN_PASSWORD=choose-a-password npm start
```

On Windows PowerShell:

```powershell
$env:ADMIN_PASSWORD = "choose-a-password"; npm start
```

Then open http://localhost:3000 for the site and http://localhost:3000/admin for the admin.

| Setting | What it does | Default |
|---|---|---|
| `ADMIN_PASSWORD` | Password for `/admin`. Required: without it nobody can log in. | none |
| `DATA_DIR` | Folder for content, images, history and messages. Must survive restarts and redeploys. | `./data` |
| `PORT` | Port to listen on | `3000` |

On first start, `content.default.json` is copied into the data folder. From then on, all edits happen through the admin.

## Publish on carbon-think.org (Render)

The site needs a host that runs Node.js and has a **persistent disk**. Without a persistent disk, edits and uploaded images are lost on every restart or redeploy. These steps use [Render](https://render.com); the `render.yaml` file sets everything up.

1. **Put the code on GitHub.** Create a new private repository on github.com (e.g. `carbon-think-website`). Then, in this folder:
   ```bash
   git init
   git add .
   git commit -m "Carbon Think website"
   git branch -M main
   git remote add origin https://github.com/<your-username>/carbon-think-website.git
   git push -u origin main
   ```
2. **Create the service.** In the Render dashboard choose **New → Blueprint**, connect GitHub and pick the repository. Render reads `render.yaml` and creates a web service with a 1 GB disk mounted at `/var/data`. This needs a paid instance; disks are not available on the free plan.
3. **Set the admin password.** Render asks for `ADMIN_PASSWORD` during setup. Use a long password that you don't use anywhere else.
4. **Connect the domain.** In the service, open **Settings → Custom Domains** and add both `carbon-think.org` and `www.carbon-think.org`. Render shows the DNS records to create.
5. **Add the DNS records** at the company where you bought the domain, exactly as Render shows them. Usually that is an `A` record for `@` and a `CNAME` record for `www`. DNS changes can take from a few minutes to a few hours. Render issues the HTTPS certificate automatically once DNS is in place.
6. Visit https://carbon-think.org, then https://carbon-think.org/admin to sign in.

Pushing new code to GitHub later redeploys the site automatically. Content and images on the disk are kept.

**Other hosts:** the `Dockerfile` runs the site anywhere that supports Docker (Railway, Fly.io, a VPS). Mount a persistent volume at `/data` and set `ADMIN_PASSWORD`.

## Email addresses

The site shows addresses such as `info@carbon-think.org`, and they can be changed in the admin under **Contact**. They only receive mail once mailboxes exist for the domain. Set them up with Google Workspace, Microsoft 365 or Zoho Mail, or use your registrar's free email forwarding to send them all to one inbox. Contact form messages do not need email: they appear in the admin under **Messages**.

## Using the admin

- **Sections** in the left menu match the sections of the website. Every text, button, list and image can be edited.
- **Lists** (cards, steps, partners, emails, photos…) have **+ Add**, ↑ ↓ to reorder, and ✕ to remove.
- **Images:** use **Upload image** or pick from the **Image library**. Large photos are resized automatically. Image slots:
  - logo and browser tab icon
  - social sharing image
  - hero background photo
  - About photo
  - Catalytic Fund image
  - research card images
  - partner logos
  - the photo gallery
- **Show this section** switches a whole section on or off. The **Photo gallery** is off until you switch it on and add photos.
- **Formatting:** `*word*` shows a word in italics (gold in headings), and `**word**` makes it bold.
- The **live preview** on the right shows your edits before they go live. Nothing changes on the public site until you press **Publish changes** (or Ctrl+S).
- **Version history** keeps the last 50 published versions; **Restore** brings any of them back.
- **Messages** lists everything sent through the contact form.

## Backups

Everything worth keeping is in the data folder (`/var/data` on Render). Render's disk snapshots cover it. You can also download a copy now and then from the Render shell.

## Project layout

```
server.js              web server, admin API, uploads, history, contact messages
lib/render.js          builds the public page from content.json
content.default.json   starting content (used once, on first start)
public/                styles, site script, favicon
public/admin/          the admin portal
render.yaml            Render blueprint
Dockerfile             container build for other hosts
```
