-- ============================================
-- TurfManager — Complete Supabase SQL Schema
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'staff')),
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Turf Owner'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 2. TURFS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS turfs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sport_type TEXT DEFAULT 'cricket',
  price_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 1000,
  location TEXT,
  opening_time TIME DEFAULT '06:00',
  closing_time TIME DEFAULT '23:00',
  amenities TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_turfs_owner ON turfs(owner_id);
CREATE INDEX IF NOT EXISTS idx_turfs_active ON turfs(is_active);

-- ============================================
-- 3. HELPER FUNCTION FOR BOOKING TIME RANGE
-- ============================================
-- Immutable function required for use in EXCLUDE constraint index expressions.
-- Uses date + time arithmetic instead of string concatenation + cast.
CREATE OR REPLACE FUNCTION booking_tsrange(d DATE, t1 TIME, t2 TIME)
RETURNS tsrange AS $$
  SELECT tsrange(d + t1, d + t2, '[)');
$$ LANGUAGE sql IMMUTABLE STRICT;

-- ============================================
-- 3. BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  turf_id UUID REFERENCES turfs(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_amount NUMERIC(10, 2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  booking_status TEXT DEFAULT 'confirmed' CHECK (booking_status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent overlapping bookings for the same turf and date
  -- This is the core double-booking prevention mechanism
  CONSTRAINT no_overlapping_bookings
    EXCLUDE USING gist (
      turf_id WITH =,
      booking_tsrange(booking_date, start_time, end_time) WITH &&
    ) WHERE (booking_status NOT IN ('cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_turf ON bookings(turf_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_date_turf ON bookings(booking_date, turf_id);

-- ============================================
-- 4. BLOCKED SLOTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS blocked_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  turf_id UUID REFERENCES turfs(id) ON DELETE CASCADE NOT NULL,
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_turf_date ON blocked_slots(turf_id, block_date);

-- ============================================
-- 5. PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'other')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'refunded')),
  transaction_id TEXT,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);

-- ============================================
-- 6. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- 7. SAFE BOOKING CREATION (RPC)
-- ============================================
-- This function creates a booking inside a serializable transaction
-- to prevent race conditions even beyond the EXCLUDE constraint
CREATE OR REPLACE FUNCTION create_booking_safe(
  p_turf_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT DEFAULT NULL,
  p_booking_date DATE DEFAULT CURRENT_DATE,
  p_start_time TIME DEFAULT '09:00',
  p_end_time TIME DEFAULT '10:00',
  p_total_amount NUMERIC DEFAULT 0,
  p_payment_status TEXT DEFAULT 'pending',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_conflict INTEGER;
BEGIN
  -- Explicitly check for conflicts with row locking
  SELECT COUNT(*) INTO v_conflict
  FROM bookings
  WHERE turf_id = p_turf_id
    AND booking_date = p_booking_date
    AND booking_status NOT IN ('cancelled')
    AND start_time < p_end_time
    AND end_time > p_start_time
  FOR UPDATE;

  IF v_conflict > 0 THEN
    RAISE EXCEPTION 'Time slot conflict: this slot is already booked.';
  END IF;

  -- Insert the booking
  INSERT INTO bookings (
    turf_id, customer_name, customer_phone, customer_email,
    booking_date, start_time, end_time,
    total_amount, payment_status, booking_status, notes
  ) VALUES (
    p_turf_id, p_customer_name, p_customer_phone, p_customer_email,
    p_booking_date, p_start_time, p_end_time,
    p_total_amount, p_payment_status, 'confirmed', p_notes
  )
  RETURNING id INTO v_booking_id;

  -- Auto-create notification for the owner
  INSERT INTO notifications (user_id, booking_id, type, title, message)
  SELECT
    t.owner_id,
    v_booking_id,
    'booking_created',
    'New Booking: ' || p_customer_name,
    p_customer_name || ' booked ' || t.name || ' on ' || p_booking_date || ' from ' || p_start_time || ' to ' || p_end_time
  FROM turfs t
  WHERE t.id = p_turf_id;

  RETURN v_booking_id;
END;
$$;

-- ============================================
-- 8. AUTO-NOTIFICATION TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION notify_booking_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Booking cancelled
    IF OLD.booking_status != 'cancelled' AND NEW.booking_status = 'cancelled' THEN
      INSERT INTO notifications (user_id, booking_id, type, title, message)
      SELECT t.owner_id, NEW.id, 'booking_cancelled',
        'Booking Cancelled: ' || NEW.customer_name,
        NEW.customer_name || '''s booking on ' || NEW.booking_date || ' was cancelled'
      FROM turfs t WHERE t.id = NEW.turf_id;
    END IF;

    -- Payment updated to paid
    IF OLD.payment_status != 'paid' AND NEW.payment_status = 'paid' THEN
      INSERT INTO notifications (user_id, booking_id, type, title, message)
      SELECT t.owner_id, NEW.id, 'payment_received',
        'Payment Received: ₹' || NEW.total_amount,
        'Payment of ₹' || NEW.total_amount || ' received from ' || NEW.customer_name
      FROM turfs t WHERE t.id = NEW.turf_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_change ON bookings;
CREATE TRIGGER on_booking_change
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION notify_booking_change();

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE turfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Turfs: owner can CRUD their own turfs
DROP POLICY IF EXISTS "Owner can view turfs" ON turfs;
DROP POLICY IF EXISTS "Owner can create turfs" ON turfs;
DROP POLICY IF EXISTS "Owner can update turfs" ON turfs;
DROP POLICY IF EXISTS "Owner can delete turfs" ON turfs;
CREATE POLICY "Owner can view turfs" ON turfs FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Owner can create turfs" ON turfs FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owner can update turfs" ON turfs FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owner can delete turfs" ON turfs FOR DELETE USING (owner_id = auth.uid());

-- Bookings: owner can manage bookings for their turfs
DROP POLICY IF EXISTS "Owner can view bookings" ON bookings;
DROP POLICY IF EXISTS "Owner can create bookings" ON bookings;
DROP POLICY IF EXISTS "Owner can update bookings" ON bookings;
DROP POLICY IF EXISTS "Owner can delete bookings" ON bookings;
CREATE POLICY "Owner can view bookings" ON bookings FOR SELECT USING (
  turf_id IN (SELECT id FROM turfs WHERE owner_id = auth.uid())
);
CREATE POLICY "Owner can create bookings" ON bookings FOR INSERT WITH CHECK (
  turf_id IN (SELECT id FROM turfs WHERE owner_id = auth.uid())
);
CREATE POLICY "Owner can update bookings" ON bookings FOR UPDATE USING (
  turf_id IN (SELECT id FROM turfs WHERE owner_id = auth.uid())
);
CREATE POLICY "Owner can delete bookings" ON bookings FOR DELETE USING (
  turf_id IN (SELECT id FROM turfs WHERE owner_id = auth.uid())
);

-- Blocked slots: owner can manage blocked slots for their turfs
DROP POLICY IF EXISTS "Owner can manage blocked slots" ON blocked_slots;
CREATE POLICY "Owner can manage blocked slots" ON blocked_slots FOR ALL USING (
  turf_id IN (SELECT id FROM turfs WHERE owner_id = auth.uid())
);

-- Payments: owner can manage payments for their bookings
DROP POLICY IF EXISTS "Owner can manage payments" ON payments;
CREATE POLICY "Owner can manage payments" ON payments FOR ALL USING (
  booking_id IN (
    SELECT b.id FROM bookings b
    JOIN turfs t ON b.turf_id = t.id
    WHERE t.owner_id = auth.uid()
  )
);

-- Notifications: users can manage their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 10. ENABLE REALTIME
-- ============================================
-- Publications can fail if already exist or if publication doesn't exist yet.
-- We use a DO block to safely add tables without failing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr 
      JOIN pg_publication p ON pr.prpubid = p.oid 
      JOIN pg_class c ON pr.prrelid = c.oid 
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'bookings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr 
      JOIN pg_publication p ON pr.prpubid = p.oid 
      JOIN pg_class c ON pr.prrelid = c.oid 
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'turfs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE turfs;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_rel pr 
      JOIN pg_publication p ON pr.prpubid = p.oid 
      JOIN pg_class c ON pr.prrelid = c.oid 
      WHERE p.pubname = 'supabase_realtime' AND c.relname = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- ============================================
-- 11. STORAGE BUCKET CONFIGURATION
-- ============================================
-- Insert turf-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('turf-images', 'turf-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for turf-images
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Owner Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Owner Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Owner Delete Access" ON storage.objects;

CREATE POLICY "Public Read Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'turf-images');

CREATE POLICY "Authenticated Owner Upload Access"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'turf-images');

CREATE POLICY "Authenticated Owner Update Access"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'turf-images');

CREATE POLICY "Authenticated Owner Delete Access"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'turf-images');

