import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Coffee, DollarSign, ShoppingCart } from "lucide-react";
import juice from "@/assets/service-juice.jpg";
import tea from "@/assets/service-tea.jpg";
import coffee from "@/assets/service-coffee.jpg";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BeverageCart } from "@/components/BeverageCart";

const getBeverageImage = (serviceName) => {
  const lowerName = serviceName.toLowerCase();
  
  if (lowerName.includes('juice')) return juice;
  if (lowerName.includes('tea')) return tea;
  if (lowerName.includes('coffee')) return coffee;
  
  return coffee;
};

const Beverages = () => {
  const [beverages, setBeverages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    fetchBeverages();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const fetchBeverages = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('category', 'Beverages')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (data) {
      setBeverages(data);
    }
    setLoading(false);
  };

  const addToCart = async (beverage) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please login to add items to cart",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .upsert({
        user_id: user.id,
        service_id: beverage.id,
        quantity: 1
      }, {
        onConflict: 'user_id,service_id',
        ignoreDuplicates: false
      });

    if (error) {
      // If item exists, increment quantity
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('service_id', beverage.id)
        .single();

      if (existing) {
        await supabase
          .from('cart_items')
          .update({ quantity: existing.quantity + 1 })
          .eq('id', existing.id);
      }
    }

    toast({
      title: "Added to cart",
      description: `${beverage.name} has been added to your cart`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-12">
            <div className="text-center flex-1 animate-fade-up">
              <Coffee className="h-16 w-16 text-primary mx-auto mb-4" />
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
                Beverages Menu
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Enjoy premium beverages while you wait or take them to go
              </p>
            </div>
            
            {user && (
              <div className="ml-4">
                <BeverageCart userId={user.id} />
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading beverages...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {beverages.map((beverage) => (
                <Card 
                  key={beverage.id} 
                  className="overflow-hidden hover:shadow-[var(--shadow-gold)] transition-all duration-300 group bg-card/50 backdrop-blur-sm border-border/50"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img 
                      src={getBeverageImage(beverage.name)}
                      alt={beverage.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-2xl font-bold text-foreground mb-1">
                        {beverage.name}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <p className="text-muted-foreground line-clamp-2 min-h-[3rem]">
                      {beverage.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary">
                        <DollarSign className="h-5 w-5" />
                        <span className="text-2xl font-bold">${beverage.price}</span>
                      </div>
                      
                      <Button 
                        onClick={() => addToCart(beverage)}
                        className="gap-2"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!loading && beverages.length === 0 && (
            <div className="text-center py-12">
              <Coffee className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No beverages available at the moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Beverages;
