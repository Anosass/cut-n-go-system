import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ImageIcon } from "lucide-react";

export const BarberGallery = ({ barberId }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGallery();
  }, [barberId]);

  const fetchGallery = async () => {
    const { data } = await supabase
      .from('barber_gallery')
      .select('*')
      .eq('barber_id', barberId)
      .order('display_order', { ascending: true });

    if (data) {
      setImages(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading gallery...</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <Card className="p-8 text-center bg-muted/20">
        <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No portfolio images yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold">Portfolio</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <Dialog key={image.id}>
            <DialogTrigger asChild>
              <Card className="overflow-hidden cursor-pointer group hover:shadow-[var(--shadow-gold)] transition-all">
                <div className="relative aspect-square">
                  <img
                    src={image.image_url}
                    alt={image.title || 'Portfolio image'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {image.title}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <div className="space-y-4">
                <img
                  src={image.image_url}
                  alt={image.title || 'Portfolio image'}
                  className="w-full h-auto rounded-lg"
                />
                {image.title && (
                  <h4 className="text-xl font-bold">{image.title}</h4>
                )}
                {image.description && (
                  <p className="text-muted-foreground">{image.description}</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
};
