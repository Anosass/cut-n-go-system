import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Scissors, Calendar, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Barber {
  id: string;
  name: string;
  bio: string;
  avatar_url: string | null;
  working_hours: any;
}

interface GalleryImage {
  id: string;
  image_url: string;
  title: string | null;
  description: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer_id: string;
}

interface BarberWithData extends Barber {
  gallery: GalleryImage[];
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  specialties: string[];
}

const BarberProfiles = () => {
  const [barbers, setBarbers] = useState<BarberWithData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      // Fetch active barbers
      const { data: barbersData, error: barbersError } = await supabase
        .from('barbers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (barbersError) throw barbersError;

      if (barbersData) {
        // Fetch gallery and reviews for each barber
        const barbersWithData = await Promise.all(
          barbersData.map(async (barber) => {
            // Fetch gallery
            const { data: gallery } = await supabase
              .from('barber_gallery')
              .select('id, image_url, title, description')
              .eq('barber_id', barber.id)
              .order('display_order');

            // Fetch reviews
            const { data: reviews } = await supabase
              .from('reviews')
              .select('id, rating, comment, created_at, customer_id')
              .eq('barber_id', barber.id)
              .order('created_at', { ascending: false });

            // Calculate average rating
            const avgRating = reviews && reviews.length > 0
              ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
              : 0;

            // Extract specialties from bio (simple implementation)
            const specialties = extractSpecialties(barber.bio);

            return {
              ...barber,
              gallery: gallery || [],
              reviews: reviews || [],
              averageRating: avgRating,
              totalReviews: reviews?.length || 0,
              specialties
            };
          })
        );

        setBarbers(barbersWithData);
      }
    } catch (error) {
      console.error('Error fetching barbers:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractSpecialties = (bio: string | null): string[] => {
    if (!bio) return ['Haircuts', 'Beard Styling'];
    
    const specialtyKeywords = [
      'fade', 'beard', 'shave', 'coloring', 'styling', 'modern', 'classic', 'razor'
    ];
    
    const found = specialtyKeywords
      .filter(keyword => bio.toLowerCase().includes(keyword))
      .map(keyword => keyword.charAt(0).toUpperCase() + keyword.slice(1));
    
    return found.length > 0 ? found : ['Haircuts', 'Beard Styling'];
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-primary text-primary' : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-up">
            <Scissors className="h-16 w-16 text-primary mx-auto mb-6 animate-glow" />
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
              Meet Our Barbers
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Skilled professionals dedicated to making you look your best
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading barber profiles...</p>
            </div>
          ) : (
            <div className="space-y-12">
              {barbers.map((barber, index) => (
                <Card 
                  key={barber.id} 
                  className="overflow-hidden hover:shadow-[var(--shadow-gold)] transition-all duration-500 bg-card/80 backdrop-blur-sm border-border/50 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="grid md:grid-cols-[300px,1fr] gap-8 p-8">
                    {/* Barber Info Section */}
                    <div className="space-y-6">
                      <div className="relative">
                        <Avatar className="h-48 w-48 mx-auto border-4 border-primary/20">
                          <AvatarImage src={barber.avatar_url || undefined} alt={barber.name} />
                          <AvatarFallback className="text-4xl bg-primary/10">
                            {barber.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary/90 backdrop-blur-sm px-4 py-1 rounded-full">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 fill-primary-foreground text-primary-foreground" />
                            <span className="font-bold text-primary-foreground">
                              {barber.averageRating > 0 ? barber.averageRating.toFixed(1) : 'New'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-center space-y-3">
                        <h2 className="text-3xl font-bold">{barber.name}</h2>
                        <p className="text-muted-foreground">{barber.bio || 'Professional barber'}</p>
                        
                        <div className="flex flex-wrap gap-2 justify-center pt-2">
                          {barber.specialties.map((specialty, idx) => (
                            <Badge key={idx} variant="secondary" className="bg-primary/10 text-primary">
                              {specialty}
                            </Badge>
                          ))}
                        </div>

                        <div className="pt-4 space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <Star className="h-4 w-4 text-primary" />
                            <span>{barber.totalReviews} {barber.totalReviews === 1 ? 'Review' : 'Reviews'}</span>
                          </div>
                        </div>

                        <Link to="/booking" state={{ barberId: barber.id }}>
                          <Button className="w-full gap-2 mt-4">
                            <Calendar className="h-4 w-4" />
                            Book with {barber.name.split(' ')[0]}
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Tabs Section */}
                    <Tabs defaultValue="portfolio" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                        <TabsTrigger value="reviews">Reviews</TabsTrigger>
                      </TabsList>

                      <TabsContent value="portfolio" className="mt-6">
                        {barber.gallery.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {barber.gallery.map((image) => (
                              <div 
                                key={image.id}
                                className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                              >
                                <img
                                  src={image.image_url}
                                  alt={image.title || 'Portfolio image'}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <div className="absolute bottom-0 left-0 right-0 p-4">
                                    {image.title && (
                                      <h4 className="font-semibold text-sm mb-1">{image.title}</h4>
                                    )}
                                    {image.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2">
                                        {image.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <Scissors className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Portfolio coming soon</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="reviews" className="mt-6">
                        {barber.reviews.length > 0 ? (
                          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            {barber.reviews.map((review) => (
                              <Card key={review.id} className="p-4 bg-muted/30">
                                <div className="flex items-start justify-between mb-2">
                                  {renderStars(review.rating)}
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(review.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                {review.comment && (
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    "{review.comment}"
                                  </p>
                                )}
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No reviews yet. Be the first to leave a review!</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!loading && barbers.length === 0 && (
            <div className="text-center py-12">
              <Scissors className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No barbers available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarberProfiles;
