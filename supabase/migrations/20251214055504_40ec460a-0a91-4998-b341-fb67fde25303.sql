-- Allow customers to cancel their own orders (including those with assigned riders)
CREATE POLICY "Customers can cancel their own orders"
ON public.orders
FOR UPDATE
USING (auth.uid() = customer_id)
WITH CHECK (
  auth.uid() = customer_id 
  AND order_status = 'cancelled'
);