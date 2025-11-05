-- Create loyalty points table
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create points transactions table
CREATE TABLE public.points_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create barber gallery table for portfolio images
CREATE TABLE public.barber_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create shopping cart table for beverages
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, service_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loyalty_points
CREATE POLICY "Users can view their own points"
ON public.loyalty_points
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert points"
ON public.loyalty_points
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update points"
ON public.loyalty_points
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for points_transactions
CREATE POLICY "Users can view their own transactions"
ON public.points_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
ON public.points_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for barber_gallery
CREATE POLICY "Everyone can view gallery images"
ON public.barber_gallery
FOR SELECT
USING (true);

CREATE POLICY "Barbers can manage their own gallery"
ON public.barber_gallery
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM public.barbers WHERE id = barber_id
  )
);

CREATE POLICY "Admins can manage all galleries"
ON public.barber_gallery
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for cart_items
CREATE POLICY "Users can view their own cart"
ON public.cart_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cart"
ON public.cart_items
FOR ALL
USING (auth.uid() = user_id);

-- Function to award points for appointments
CREATE OR REPLACE FUNCTION public.award_points_for_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_price NUMERIC;
  points_to_award INTEGER;
BEGIN
  -- Only award points when appointment is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get service price
    SELECT price INTO service_price
    FROM public.services
    WHERE id = NEW.service_id;
    
    -- Award 1 point per dollar spent
    points_to_award := FLOOR(service_price);
    
    -- Insert or update loyalty points
    INSERT INTO public.loyalty_points (user_id, total_points, lifetime_points)
    VALUES (NEW.customer_id, points_to_award, points_to_award)
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_points = loyalty_points.total_points + points_to_award,
      lifetime_points = loyalty_points.lifetime_points + points_to_award,
      updated_at = now();
    
    -- Record transaction
    INSERT INTO public.points_transactions (user_id, points, transaction_type, reference_id, description)
    VALUES (
      NEW.customer_id,
      points_to_award,
      'appointment',
      NEW.id,
      'Points earned from appointment'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for appointment points
CREATE TRIGGER award_points_on_appointment_complete
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.award_points_for_appointment();

-- Add triggers for updated_at columns
CREATE TRIGGER update_loyalty_points_updated_at
BEFORE UPDATE ON public.loyalty_points
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();