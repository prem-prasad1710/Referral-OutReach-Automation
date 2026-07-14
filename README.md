# Referral Outreach Automation

A full-stack Next.js application for sending personalized job referral emails with resume attachments, AI-powered intros, and campaign tracking.

## Features

- **Resume upload** — PDF versioning with active resume selection
- **Contact import** — CSV and Excel (Name, Email, Company, Designation, LinkedIn URL)
- **Email templates** — `{{name}}`, `{{company}}`, `{{designation}}`, `{{ai_intro}}` placeholders
- **AI personalization** — Groq (Llama) generates unique intro paragraphs per contact
- **Preview & edit** — Review and customize emails before sending
- **Sending engine** — Nodemailer with Gmail/Outlook SMTP, delays (30–120s), retry, pause/resume
- **Analytics** — Dashboard with sent/failed/success rate and CSV log export
- **Encrypted SMTP** — App passwords stored encrypted in SQLite

## Tech Stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Prisma + SQLite
- Nodemailer, Groq API (OpenAI-compatible)
- React Hook Form, Zod, Lucide Icons

## Setup

### 1. Install dependencies

```bash
cd ~/Desktop/referral-outreach-automation
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="file:./dev.db"
ENCRYPTION_KEY="<run: openssl rand -hex 32>"
GROQ_API_KEY="gsk-your-groq-api-key"
GROQ_MODEL="llama-3.3-70b-versatile"
```

Optional SMTP fallback (UI settings take precedence):

```env
SMTP_PROVIDER="gmail"
SMTP_EMAIL="your@gmail.com"
SMTP_APP_PASSWORD="your-app-password"
```

### 3. Initialize database

```bash
npm run db:push
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Optional: CLI worker

```bash
npm run worker
```

## Gmail App Password

1. Enable 2-Step Verification on your Google account
2. Go to Google Account → Security → App passwords
3. Create an app password for "Mail"
4. Enter email + app password in **Settings** in the app

## Outlook App Password

1. Enable 2FA on your Microsoft account
2. Go to Microsoft Account → Security → Advanced security options
3. Create an app password
4. Use `your@outlook.com` and the app password in **Settings**

## Usage Flow

1. **Settings** — Configure Gmail or Outlook SMTP (test connection)
2. **Upload Contacts** — Import CSV/Excel with Name, Email, Company, Designation
3. **Upload Resume** — Upload your PDF resume
4. **Create Campaign** — Select contacts, edit templates, set delay (30–120s)
5. **Preview** — Review AI-personalized emails; edit per recipient
6. **Send** — Start campaign; pause/resume as needed
7. **Analytics** — Monitor sent/failed/success rate; export logs

## Contact CSV Example

```csv
Name,Email,Company,Designation
Rahul Sharma,rahul@company.com,Adobe,Senior Software Engineer
Priya Singh,priya@company.com,Adobe,Engineering Manager
```

## Email Personalization

Every email greets the recipient by first name from the Name column:

- Rahul → `Hi Rahul,`
- Priya → `Hi Priya,`

The resume PDF is attached to every outgoing email automatically.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Sync Prisma schema |
| `npm run db:studio` | Open Prisma Studio |
| `npm run worker` | Background campaign worker |

## Deploying to Vercel

**Do not use SQLite on Vercel.** Serverless functions have an ephemeral filesystem, so `file:./dev.db` will not persist and tables will not exist at runtime.

1. Create a hosted Postgres database (e.g. [Neon](https://neon.tech), [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), or Supabase).
2. In the Vercel project **Settings → Environment Variables**, set:
   - `DATABASE_URL` — Postgres connection string
   - `ENCRYPTION_KEY` — same value as local (`openssl rand -hex 32`)
   - `GROQ_API_KEY`, `GROQ_MODEL`, and any SMTP vars you need
3. Update `prisma/schema.prisma` datasource provider from `sqlite` to `postgresql` before deploying (Postgres and SQLite cannot share the same Prisma provider setting).
4. Redeploy. The `vercel-build` script runs `prisma db push` to create tables before `next build`.

Dashboard routes are rendered dynamically at request time so the build does not query the database during static generation.

**Note:** Resume PDFs are stored on the local filesystem (`uploads/resumes/`). That path is not durable on Vercel serverless. For production, use object storage (S3, Vercel Blob, etc.) or deploy to a platform with persistent disk.

## Project Structure

```
src/
├── app/(dashboard)/     # UI pages
├── app/api/             # API routes
├── components/          # React components
├── lib/                 # Core services (email, AI, parser, worker)
└── types/               # TypeScript types
prisma/schema.prisma     # Database models
uploads/resumes/         # Resume PDF storage
```
