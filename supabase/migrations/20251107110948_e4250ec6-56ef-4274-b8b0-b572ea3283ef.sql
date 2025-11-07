-- Add photo storage to reviews table
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS photos TEXT[];

-- Create referral codes table
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_referral UNIQUE (user_id)
);

-- Create referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  awarded_at TIMESTAMPTZ
);

-- Create rewards catalog table
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create redemptions table
CREATE TABLE IF NOT EXISTS public.redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id),
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ
);

-- Create push notification tokens table
CREATE TABLE IF NOT EXISTS public.notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_token UNIQUE (user_id)
);

-- Create storage bucket for review photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_codes
CREATE POLICY "Users can view their own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referral code"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for referrals
CREATE POLICY "Users can view referrals they're involved in"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "System can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update referrals"
  ON public.referrals FOR UPDATE
  USING (true);

-- RLS Policies for rewards
CREATE POLICY "Everyone can view active rewards"
  ON public.rewards FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage rewards"
  ON public.rewards FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for redemptions
CREATE POLICY "Users can view their own redemptions"
  ON public.redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create redemptions"
  ON public.redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own redemptions"
  ON public.redemptions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for notification_tokens
CREATE POLICY "Users can manage their own tokens"
  ON public.notification_tokens FOR ALL
  USING (auth.uid() = user_id);

-- Storage policies for review photos
CREATE POLICY "Users can upload review photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Review photos are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-photos');

CREATE POLICY "Users can delete their own review photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Function to award referral bonus
CREATE OR REPLACE FUNCTION public.award_referral_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_user_id UUID;
  bonus_points INTEGER := 50;
BEGIN
  -- Check if this is a first completed appointment for a referred user
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Find if this customer was referred
    SELECT referrer_id INTO referrer_user_id
    FROM public.referrals
    WHERE referee_id = NEW.customer_id AND status = 'pending'
    LIMIT 1;
    
    IF referrer_user_id IS NOT NULL THEN
      -- Award bonus points to referrer
      UPDATE public.loyalty_points
      SET total_points = total_points + bonus_points,
          lifetime_points = lifetime_points + bonus_points,
          updated_at = now()
      WHERE user_id = referrer_user_id;
      
      -- Record transaction
      INSERT INTO public.points_transactions (user_id, points, transaction_type, reference_id, description)
      VALUES (referrer_user_id, bonus_points, 'referral', NEW.id, 'Referral bonus');
      
      -- Update referral status
      UPDATE public.referrals
      SET status = 'completed',
          points_awarded = bonus_points,
          awarded_at = now(),
          appointment_id = NEW.id
      WHERE referee_id = NEW.customer_id AND status = 'pending';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for referral bonus
DROP TRIGGER IF EXISTS award_referral_bonus_trigger ON public.appointments;
CREATE TRIGGER award_referral_bonus_trigger
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.award_referral_bonus();

-- Function to redeem points
CREATE OR REPLACE FUNCTION public.redeem_reward(
  _user_id UUID,
  _reward_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_points INTEGER;
  reward_cost INTEGER;
  redemption_id UUID;
BEGIN
  -- Get current points
  SELECT total_points INTO current_points
  FROM public.loyalty_points
  WHERE user_id = _user_id;
  
  -- Get reward cost
  SELECT points_cost INTO reward_cost
  FROM public.rewards
  WHERE id = _reward_id AND is_active = true;
  
  -- Check if user has enough points
  IF current_points < reward_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient points');
  END IF;
  
  -- Deduct points
  UPDATE public.loyalty_points
  SET total_points = total_points - reward_cost,
      updated_at = now()
  WHERE user_id = _user_id;
  
  -- Create redemption record
  INSERT INTO public.redemptions (user_id, reward_id, points_spent, expires_at)
  VALUES (_user_id, _reward_id, reward_cost, now() + interval '30 days')
  RETURNING id INTO redemption_id;
  
  -- Record transaction
  INSERT INTO public.points_transactions (user_id, points, transaction_type, reference_id, description)
  VALUES (_user_id, -reward_cost, 'redemption', redemption_id, 'Reward redemption');
  
  RETURN jsonb_build_object('success', true, 'redemption_id', redemption_id);
END;
$$;

-- Insert sample rewards
INSERT INTO public.rewards (name, description, points_cost, discount_type, discount_value) VALUES
  ('$5 Off Any Service', 'Get $5 off your next service', 50, 'fixed', 5),
  ('10% Off Haircut', 'Get 10% off any haircut service', 100, 'percentage', 10),
  ('Free Beard Trim', 'Complimentary beard trim service', 150, 'free_service', 0),
  ('Free Beverage', 'Free beverage of your choice', 25, 'free_item', 0),
  ('$20 Off Premium Service', 'Get $20 off any premium service', 250, 'fixed', 20)
ON CONFLICT DO NOTHING;