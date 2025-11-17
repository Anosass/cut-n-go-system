-- Create waiting list table
CREATE TABLE public.waiting_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_id UUID NOT NULL,
  barber_id UUID,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_waiting_list_service FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE,
  CONSTRAINT fk_waiting_list_barber FOREIGN KEY (barber_id) REFERENCES public.barbers(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

-- Users can view their own waiting list entries
CREATE POLICY "Users can view their own waiting list entries"
ON public.waiting_list
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own waiting list entries
CREATE POLICY "Users can create waiting list entries"
ON public.waiting_list
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own waiting list entries
CREATE POLICY "Users can update their own waiting list entries"
ON public.waiting_list
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own waiting list entries
CREATE POLICY "Users can delete their own waiting list entries"
ON public.waiting_list
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all waiting list entries
CREATE POLICY "Admins can view all waiting list entries"
ON public.waiting_list
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_waiting_list_updated_at
BEFORE UPDATE ON public.waiting_list
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_waiting_list_date_time ON public.waiting_list(appointment_date, appointment_time, status);
CREATE INDEX idx_waiting_list_user ON public.waiting_list(user_id, status);