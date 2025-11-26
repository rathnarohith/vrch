-- Fix: Add search_path to functions to prevent search path manipulation attacks

-- Update the update_updated_at_column function to include search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update the handle_new_user function to include search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, username, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  
  -- Insert role (default customer)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'customer')
  );
  
  -- If role is rider, create rider profile
  IF (NEW.raw_user_meta_data->>'role') = 'rider' THEN
    INSERT INTO public.rider_profiles (user_id, vehicle_type)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'bike')
    );
  END IF;
  
  RETURN NEW;
END;
$function$;