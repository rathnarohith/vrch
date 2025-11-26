-- Fix: Add RLS policy to allow riders to accept pending orders
-- This fixes the critical issue where riders cannot claim unassigned orders

CREATE POLICY "Riders can accept pending orders" ON orders
FOR UPDATE TO authenticated
USING (
  order_status = 'pending' 
  AND rider_id IS NULL 
  AND has_role(auth.uid(), 'rider'::app_role)
)
WITH CHECK (
  rider_id = auth.uid() 
  AND order_status = 'rider-assigned'
);