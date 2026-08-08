# vendor/

Third-party browser bundles served from our own origin instead of a public CDN.

## Why

`app.html` used to pull the Supabase client from `cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
— the only third-party script in the whole site (Clerk is already served from
`clerk.trystacked.app`). That had two problems:

1. **Availability.** If jsDelivr is unreachable — a campus network with content filtering, an
   ad blocker, a CDN outage — `window.supabase` is undefined. That used to blank the entire
   app; it now degrades to local-only (see `app-auth.js`), but the student still silently
   loses cloud sync.
2. **Integrity.** The tag was an unpinned range (`@2`) with no `integrity` attribute, so
   whatever the CDN returned executed with full access to the Clerk session and the Supabase
   token. SRI isn't even expressible against a floating range.

Serving it ourselves fixes both, and makes the site consistent: no runtime dependency on a
host we don't control.

Same-origin files don't carry an `integrity` attribute — SRI protects against a *third party*
serving something unexpected, and if our own origin is compromised the attribute is
compromised with it. The provenance record below is the equivalent guarantee.

## supabase-js-2.110.6.js

| | |
|---|---|
| Package | `@supabase/supabase-js@2.110.6` |
| Source | `node_modules/@supabase/supabase-js/dist/umd/supabase.js` |
| Size | 206,966 bytes |
| SHA-384 | `sha384-SR76iDF5vfiuFuYEigF/LOTQIXTU5SrR3Ij29NELtBswNOxcSLM6iMr8OVRzUycq` |
| SHA-256 | `0ee30738f13379d3b4eb1a9f57773df5e55c0bea643aad77382d473332df4b7b` |

This is byte-identical to what the CDN was serving: the package's own `jsdelivr` and `unpkg`
fields both point at `dist/umd/supabase.js`, so that URL resolved to this exact file. The
bundle is UMD and assigns the `supabase` global, which is what `app-auth.js` reads.

2.110.6 is the version this project already runs — it's what `mobile/package-lock.json`
resolves (integrity `sha512-UJTAz1NUiSRI2mQYhUPvNMwqfkSucV1iSCcMJz8jgsSUTOfic9C3D6LGNOrH6KTvYUhxRvnf3ktq2Sd3IXIQzQ==`),
and `mobile/src/lib/supabase.ts` uses the same `accessToken` option `app-auth.js` does, so web
and mobile talk to Supabase through identical, already-exercised code.

### Updating

```sh
cd mobile && npm install @supabase/supabase-js@<new-version> && cd ..
cp mobile/node_modules/@supabase/supabase-js/dist/umd/supabase.js vendor/supabase-js-<new-version>.js
node -e "const c=require('crypto'),f=require('fs');const b=f.readFileSync('vendor/supabase-js-<new-version>.js');console.log(b.length,'sha384-'+c.createHash('sha384').update(b).digest('base64'))"
```

Then update the `<script src>` in `app.html`, refresh the table above, and delete the old
file. Keep the version in the filename — it's what makes the pin visible at the call site.

`scripts/build.js` copies repo-root directories into `dist/` by blocklist, so this folder is
published automatically; nothing there needs changing when a version bumps.
