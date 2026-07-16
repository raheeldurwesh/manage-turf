# TurfManager — Turf Booking Management System

A modern, production-ready turf booking dashboard built with **React**, **Tailwind CSS**, and **Supabase**.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Copy your **Project URL** and **Anon Key**
3. Update `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Schema
Go to **Supabase Dashboard → SQL Editor** and run the contents of `supabase/schema.sql`.

### 4. Create Owner Account
In **Supabase Dashboard → Authentication → Users**, create a new user with email/password.

### 5. Start Dev Server
```bash
npm run dev
```

### 6. (Optional) Deploy WhatsApp Edge Function
```bash
supabase functions deploy send-whatsapp
```

## Features
- ✅ Owner-only dashboard with auth
- ✅ Turf CRUD with amenities
- ✅ Booking management with double-booking prevention
- ✅ Interactive calendar (month/day views)
- ✅ Real-time updates via Supabase
- ✅ Revenue reports & analytics
- ✅ In-app notifications
- ✅ WhatsApp integration (Edge Function)
- ✅ Dark mode
- ✅ Fully responsive
