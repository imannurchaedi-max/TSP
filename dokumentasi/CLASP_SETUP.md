# CLASP Setup

## Auth Account

Deploy production wajib memakai akun Google resmi:

```text
dayaanugrahmuly4@gmail.com
```

Akun ini harus memiliki akses ke Apps Script project dan spreadsheet runtime.

## Local Credential Policy

Jangan simpan credential/token clasp di Git atau dokumentasi.

File/token berikut bersifat lokal dan rahasia:

- `C:\Users\sapuuser\.clasprc.json`
- OAuth refresh/access token

## Project Binding

Binding Apps Script:

```text
.clasp.json
scriptId: 1FwO2eOD9kCwYifAD0j8kuJ4hKBR5CAYcRia8yeV1MLgGEJJOGOfKh4QY
rootDir: ./Active
```

Production deployment ID:

```text
AKfycby138TTFstXSl6X2B46nmFgT9o-Eia4bTiS8UNK1kE4IPXEcWVEvik1hkYBUjteT4ZVlQ
```

## Login And Deploy

```powershell
npx clasp login
npm run deploy
```

Jika login memakai akun selain `dayaanugrahmuly4@gmail.com`, production endpoint bisa gagal akses data walaupun deploy terlihat sukses.
