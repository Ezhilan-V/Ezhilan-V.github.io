# Firebase Realtime Database — visitor map setup

The visitor-stats card on the Connect section can show a real-time map of
**every** visitor's approximate location across the world (one pin per
visitor session). This requires a free Firebase Realtime Database.

If you don't set this up, the map still works — it just shows the current
visitor's location plus sample dots, with no cross-visitor sharing.

---

## One-time setup (~5 minutes)

### 1. Create a Firebase project

1. Go to <https://console.firebase.google.com>.
2. Click **Add project**.
3. Name: `ezhilan-portfolio` (anything is fine).
4. Disable Google Analytics for the project (we already use GA on the site
   itself; this Firebase project just needs the database).
5. Click **Create project**, wait, then **Continue**.

### 2. Create a Realtime Database

1. In the left sidebar: **Build → Realtime Database**.
2. Click **Create Database**.
3. Pick a location (any region is fine; pick the one closest to you).
4. **Important — choose "Start in test mode"** when prompted. This gives
   public read/write for 30 days; you'll harden this in step 3 right after.
5. Click **Enable**.

After creation you'll see a URL at the top of the page like

```
https://ezhilan-portfolio-default-rtdb.firebaseio.com/
```

Copy this URL — you'll paste it into `src/index.html` in step 4.

### 3. Set the security rules

Click the **Rules** tab on the same page. Replace the entire JSON with the
block below. It covers the two collections the site uses:

- **`/pins`** — public read + write. Powers the world map.
- **`/messages`** — write-only public. Inbound contact-form submissions.
  No public read, so visitors can't snoop at each other's messages; only you
  see them via the Firebase console.

```json
{
  "rules": {
    ".read": false,
    ".write": false,

    "pins": {
      ".read": true,
      ".write": true,
      "$pin": {
        ".validate": "newData.hasChildren(['lat','lon','ts','country']) && newData.child('lat').isNumber() && newData.child('lon').isNumber() && newData.child('ts').isNumber() && newData.child('country').isString() && newData.child('country').val().length <= 4 && (!newData.child('city').exists() || newData.child('city').val().length <= 80)"
      }
    },

    "messages": {
      ".read": false,
      ".write": true,
      "$msg": {
        ".validate": "newData.hasChildren(['name','message','ts']) && newData.child('name').isString() && newData.child('name').val().length <= 80 && newData.child('message').isString() && newData.child('message').val().length <= 4000 && newData.child('ts').isNumber() && (!newData.child('email').exists() || newData.child('email').val().length <= 120) && (!newData.child('subject').exists() || newData.child('subject').val().length <= 160)"
      }
    }
  }
}
```

Click **Publish**.

**What `.validate` does on each collection:**
- `/pins`: lat/lon/ts/country present and well-typed. Blocks junk writes.
- `/messages`: name and message required, length-limited. `read` is `false`
  so the public can't see the inbox.

### 4. Paste the URL into `src/index.html`

Open `src/index.html`, find this line near the top:

```javascript
window.FIREBASE_DB_URL = ''; // ← e.g. 'https://ezhilan-portfolio-default-rtdb.firebaseio.com'
```

Paste your URL inside the quotes (no trailing slash needed; the code strips
it either way):

```javascript
window.FIREBASE_DB_URL = 'https://ezhilan-portfolio-default-rtdb.firebaseio.com';
```

### 5. Build and deploy

```bash
npx ng build
git add docs/ src/index.html
git commit -m "enable Firebase Realtime DB visitor map"
git push
```

### 6. Verify

1. Open your live site in incognito (or any browser that hasn't visited
   recently).
2. Scroll to the **Connect** section. The card heading should switch to
   "Each green pin is the current visitor; blue pins are real visitors from
   the last few days."
3. Open the Firebase Console → Realtime Database → **Data**. You should
   see one entry under `pins/` with your lat/lon/country/city.
4. Open another browser (or ask a friend on a different network). Their
   pin should appear within a few seconds, and yours should appear on
   their map too.

---

## How it works

- Each new session writes **one pin** to `/pins`. Repeat visits in the
  same browser session are deduped via `sessionStorage`.
- The pin contains: `lat` (rounded to 2 decimals = ~1 km), `lon`,
  `country`, optional `city`, `ts` (epoch ms). No IP, no user agent,
  no name.
- On page load, the card fetches the last ~30 pins from the last 14 days
  and renders them as blue dots. Pins older than 14 days are filtered out
  client-side (they stay in the DB; see "Pruning" below).
- The current visitor's pin is rendered green so it's easy to spot.

---

## Free tier limits

Firebase Realtime Database free tier:
- **1 GB** of stored data
- **10 GB / month** of bandwidth
- **100 simultaneous connections**

A pin is ~150 bytes. 1 GB = ~7 million pins. For a personal portfolio,
you'll never come close.

The bandwidth comes from the page reading the pins on every visit.
Each fetch returns ~30 pins ≈ 5 KB. 10 GB / 5 KB = ~2 million page
loads / month before you hit the bandwidth cap.

---

## Pruning old pins (optional, recommended monthly)

Pins accumulate forever unless you clear them. To keep the DB lean:

### Option A — manual prune in the Firebase Console

1. Open Realtime Database → **Data** → click on `pins`.
2. Click the small `…` menu next to `pins` → **Delete this node**.
3. The map will start fresh; new visitors will repopulate it.

### Option B — keep only the last N

Click the **Rules** tab and add a server-side `.indexOn` so old pins can
be queried efficiently, then run a one-off script (locally) to delete
anything older than 14 days. Out of scope for this doc; the manual
option above takes 10 seconds.

---

## Reading inbound messages (`/messages`)

Every contact-form submission is saved to `/messages` even if the visitor
never hits Send in their email client. To read them:

1. Open the Firebase Console → **Realtime Database** → **Data**.
2. Expand the `messages` node.
3. Each entry is a push-id with `name`, `email`, `subject`, `message`, `ts`.

Tip: Firebase doesn't email you when new messages land. To stay on top of it:
- **Easiest:** check the console once a day, or whenever someone tells you
  they emailed you and you can't find it in your inbox.
- **Better:** set up a Firebase Function that watches `/messages` and forwards
  to your email. Free tier covers it. Out of scope for this doc — start with
  the manual flow and add later if volume justifies it.

To clean up old messages, hover the entry → click `×`.

---

## Disabling Firebase later

Set `window.FIREBASE_DB_URL = ''` in `src/index.html`, rebuild, push.
The map falls back to the per-browser localStorage view and the contact form
falls back to mailto-only.

---

## Security notes

- The rules above let anyone POST a pin. That is the intended cost of
  having no backend.
- Validation blocks malformed writes (anything missing required fields
  or with wrong types is rejected by the database).
- Worst-case abuse: someone scripts pin spam. Mitigation: delete the
  `pins` node manually (option A above) and they have to start over.
- The `country` and `city` strings are length-limited in the rules and
  the client truncates them too — no XSS surface.
