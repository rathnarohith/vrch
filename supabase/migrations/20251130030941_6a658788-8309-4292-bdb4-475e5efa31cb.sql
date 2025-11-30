-- Add payment fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash_on_delivery' CHECK (payment_method IN ('cash_on_delivery', 'online')),
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;