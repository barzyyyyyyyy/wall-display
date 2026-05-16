# Schedule sync script

Runs on your home PC (residential IP) to fetch Webtop schedules and push them
to the wall-display app on Vercel. Needed because Webtop's WAF blocks
Vercel's data-center IPs but allows your home connection.

## One-time setup

### 1. Generate a sync secret

Open PowerShell and run:

```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Copy the string it prints — you'll use it in two places below.

### 2. Add it to Vercel

1. Go to https://vercel.com/dashboard → your `wall-display` project
2. Settings → Environment Variables
3. Add: **Key** `SYNC_SECRET`, **Value** = the string from step 1
4. Tick **Production**, **Preview**, **Development** → Save
5. Trigger a redeploy: Deployments tab → ⋯ on the latest deployment → Redeploy

### 3. Create `scripts/config.json`

Copy `config.example.json` to `config.json` in the same folder. Open it and fill in:

- **uploadKey**: the same secret from step 1
- **siblings**: one entry per sibling
  - `slot`: `"right"` or `"left"` (which column on the wall display)
  - `name`: display name (e.g. `"ליה"`)
  - `curl`: the entire `Copy as cURL (bash)` of the
    `ShotefSchedualeDataForToday` request from Chrome's Network tab while
    logged in to Webtop as that sibling

Save. `config.json` is gitignored so your captured cookies stay local.

### 4. Test the script

From the project root:

```powershell
node scripts/update-schedule.mjs
```

You should see:

```
[date] Running for N sibling(s)
[date] ✓ ליה (right): pulled 6 lessons, total now 6
```

Refresh the wall display — the schedule for that sibling now matches Webtop.

### 5. Schedule it with Windows Task Scheduler

1. Press **Win** → type `Task Scheduler` → open
2. **Action → Create Basic Task...**
3. Name: `Wall Display Schedule Sync`
4. Trigger: **Daily** → recur every 1 day → start time 06:00
5. Action: **Start a program**
   - Program/script: `node`
   - Add arguments: `scripts\update-schedule.mjs`
   - Start in: `C:\Users\yoavf\projects\wall-display`
6. Finish

Then to make it run hourly:
1. Find the new task in Task Scheduler Library → right-click → Properties
2. Triggers tab → Edit
3. Advanced settings → tick **"Repeat task every"** → 1 hour, for a duration of 1 day
4. OK → OK

The script now runs once an hour as long as your PC is on (and skips uploads
on weekends/holidays when Webtop returns 0 lessons).

## When the Webtop token expires

You'll notice the wall display schedule getting stale, and `node
scripts/update-schedule.mjs` will print something like:

```
✗ ליה (right): Webtop HTTP 401: ...
```

Re-capture the cURL from Chrome (same steps as initial setup), paste the new
one into `config.json`, save. Next run picks it up.
