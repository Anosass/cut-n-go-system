import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface WorkingHours {
  [key: string]: { start: string; end: string; enabled: boolean };
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const BarberProfileSetup = () => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: { start: "09:00", end: "17:00", enabled: false },
    tuesday: { start: "09:00", end: "17:00", enabled: true },
    wednesday: { start: "09:00", end: "17:00", enabled: true },
    thursday: { start: "09:00", end: "17:00", enabled: true },
    friday: { start: "09:00", end: "17:00", enabled: true },
    saturday: { start: "09:00", end: "17:00", enabled: true },
    sunday: { start: "09:00", end: "17:00", enabled: false },
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    checkBarberRole();
  }, []);

  const checkBarberRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setUserId(session.user.id);

    // Check if user has barber role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    const hasBarberRole = roles?.some(r => r.role === 'barber');
    if (!hasBarberRole) {
      toast({
        title: "Access Denied",
        description: "You need barber role to access this page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // Check if barber profile exists
    const { data: barber } = await supabase
      .from('barbers')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (barber) {
      setBarberId(barber.id);
      setName(barber.name || "");
      setBio(barber.bio || "");
      setAvatarUrl(barber.avatar_url || "");
      if (barber.working_hours) {
        setWorkingHours(barber.working_hours as WorkingHours);
      }
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('review-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('review-photos')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast({ title: "Avatar uploaded successfully" });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (barberId) {
        // Update existing profile
        const { error } = await supabase
          .from('barbers')
          .update({
            name,
            bio,
            avatar_url: avatarUrl,
            working_hours: workingHours,
          })
          .eq('id', barberId);

        if (error) throw error;
        toast({ title: "Profile updated successfully" });
      } else {
        // Create new profile
        const { error } = await supabase
          .from('barbers')
          .insert({
            user_id: userId,
            name,
            bio,
            avatar_url: avatarUrl,
            working_hours: workingHours,
            is_active: true,
          });

        if (error) throw error;
        toast({ title: "Profile created successfully" });
      }
      navigate("/barber");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWorkingHours = (day: string, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            {barberId ? "Edit Barber Profile" : "Create Barber Profile"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your professional name"
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell customers about your experience and specialties..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Profile Picture</Label>
                  <div className="flex items-center gap-4 mt-2">
                    {avatarUrl && (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                        className="cursor-pointer"
                      />
                    </div>
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Working Hours</h2>
              <div className="space-y-4">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-32">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={workingHours[day].enabled}
                          onCheckedChange={(checked) => updateWorkingHours(day, 'enabled', checked)}
                        />
                        <Label className="capitalize">{day}</Label>
                      </div>
                    </div>
                    {workingHours[day].enabled && (
                      <>
                        <Input
                          type="time"
                          value={workingHours[day].start}
                          onChange={(e) => updateWorkingHours(day, 'start', e.target.value)}
                          className="w-32"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={workingHours[day].end}
                          onChange={(e) => updateWorkingHours(day, 'end', e.target.value)}
                          className="w-32"
                        />
                      </>
                    )}
                    {!workingHours[day].enabled && (
                      <span className="text-muted-foreground">Day off</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {barberId ? "Update Profile" : "Create Profile"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(barberId ? "/barber" : "/")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BarberProfileSetup;
