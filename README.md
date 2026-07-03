# Velo Nero Home

Applicazione Velo Nero migrata lato server a Supabase per autenticazione, utenti, ruoli, log, diario, azioni e traffici.

## Variabili ambiente Vercel

Configurare su Vercel **senza inserire chiavi nel codice**:

- `SUPABASE_URL` = `https://conqmdvxvakgrvmqxuys.supabase.co`
- `SUPABASE_ANON_KEY` = chiave anon/public del progetto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` = chiave service role del progetto Supabase
- `AUTH_SECRET` = stringa lunga e casuale per firmare il cookie `vn_token`
- `GOOGLE_CLIENT_ID` = opzionale, se usato dalla UI esistente

Le variabili Vercel KV/Redis/Upstash non sono più richieste.

## Migration Supabase

Applicare il file SQL in `supabase/migrations/202607030001_initial_schema.sql` con uno di questi metodi:

1. Supabase Dashboard → SQL Editor → incollare ed eseguire il contenuto del file.
2. Supabase CLI:

```bash
supabase link --project-ref conqmdvxvakgrvmqxuys
supabase db push
```

La migration crea `roles`, `profiles`, `auth_tokens`, `activity_logs`, `diary_entries`, `actions`, `traffic_records` e `client_storage` per sostituire la persistenza browser locale con persistenza Supabase.

## Primo login admin

1. In Supabase Dashboard → Authentication → Users, creare l'utente:
   - email: `m.colurci@gmail.com`
   - password temporanea: `Mike00`
   - email confirmed: attivo
2. Applicare la migration: inserisce/aggiorna il profilo iniziale `Mike` con ruolo `admin`.
3. Accedere dalla UI esistente con email `m.colurci@gmail.com` e password temporanea `Mike00`.
4. Dopo il primo accesso, cambiare la password da Supabase Auth o dalla futura schermata di gestione password.

## Sviluppo

```bash
npm install
npm run lint
npm run build
```
