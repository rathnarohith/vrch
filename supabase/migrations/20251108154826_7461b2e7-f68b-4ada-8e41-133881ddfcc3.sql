-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('customer', 'rider', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL,
  phone TEXT NOT NULL,
  profile_pic TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create rider_profiles table
CREATE TABLE public.rider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('bike', 'trolley')),
  is_online BOOLEAN DEFAULT false,
  current_location_lat DECIMAL(10, 8),
  current_location_lng DECIMAL(11, 8),
  total_distance DECIMAL(10, 2) DEFAULT 0,
  earnings DECIMAL(10, 2) DEFAULT 0,
  incentives TEXT DEFAULT '₹5 Lakhs Insurance',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pickup_address TEXT NOT NULL,
  pickup_lat DECIMAL(10, 8) NOT NULL,
  pickup_lng DECIMAL(11, 8) NOT NULL,
  drop_address TEXT NOT NULL,
  drop_lat DECIMAL(10, 8) NOT NULL,
  drop_lng DECIMAL(11, 8) NOT NULL,
  package_weight DECIMAL(10, 2) NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('bike', 'trolley')),
  distance DECIMAL(10, 2) NOT NULL,
  total_fare DECIMAL(10, 2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  payment_id TEXT,
  order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending', 'rider-assigned', 'picked-up', 'in-transit', 'delivered', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for rider_profiles
CREATE POLICY "Riders can view their own profile"
  ON public.rider_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Riders can update their own profile"
  ON public.rider_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Riders can insert their own profile"
  ON public.rider_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'rider'));

CREATE POLICY "Admins can view all rider profiles"
  ON public.rider_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Customers can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Riders can view orders assigned to them"
  ON public.orders FOR SELECT
  USING (auth.uid() = rider_id);

CREATE POLICY "Riders can view available orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'rider') AND order_status = 'pending');

CREATE POLICY "Customers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id AND public.has_role(auth.uid(), 'customer'));

CREATE POLICY "Riders can update orders assigned to them"
  ON public.orders FOR UPDATE
  USING (auth.uid() = rider_id AND public.has_role(auth.uid(), 'rider'));

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rider_profiles_updated_at
  BEFORE UPDATE ON public.rider_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();