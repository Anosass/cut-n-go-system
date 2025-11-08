import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Calendar, DollarSign, Scissors, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import classicHaircut from "@/assets/service-classic-haircut.jpg";
import fade from "@/assets/service-fade.jpg";
import beardTrim from "@/assets/service-beard-trim.jpg";
import shave from "@/assets/service-shave.jpg";
import kids from "@/assets/service-kids.jpg";
import coloring from "@/assets/service-coloring.jpg";
import combo from "@/assets/service-combo.jpg";
import juice from "@/assets/service-juice.jpg";
import tea from "@/assets/service-tea.jpg";
import coffee from "@/assets/service-coffee.jpg";

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category: string;
  image_url?: string;
}

interface ServiceAdvice {
  styling: string[];
  faceShapes: string[];
  maintenance: string[];
}

const serviceAdvice: Record<string, Record<string, ServiceAdvice>> = {
  haircuts: {
    classic: {
      styling: ["Apply light pomade for a polished look", "Use a comb for precise styling", "Blow dry for added volume"],
      faceShapes: ["Oval", "Square", "Rectangle"],
      maintenance: ["Trim every 4-6 weeks", "Shampoo 3-4 times per week", "Use quality hair products"]
    },
    fade: {
      styling: ["Keep the top slightly textured", "Use matte clay for natural hold", "Style with fingers for casual look"],
      faceShapes: ["Round", "Oval", "Heart-shaped"],
      maintenance: ["Touch-up fade every 2-3 weeks", "Moisturize scalp regularly", "Clean neckline between cuts"]
    },
    modern: {
      styling: ["Apply styling cream to damp hair", "Create texture with sea salt spray", "Use heat protectant before blow drying"],
      faceShapes: ["All face shapes", "Especially suits angular faces"],
      maintenance: ["Trim every 3-5 weeks", "Deep condition weekly", "Avoid over-washing"]
    }
  },
  beard: {
    trim: {
      styling: ["Use beard oil daily for softness", "Comb beard to distribute oils evenly", "Shape edges with precision trimmer"],
      faceShapes: ["Square", "Rectangle", "Diamond"],
      maintenance: ["Trim every 2-3 weeks", "Wash beard 2-3 times per week", "Apply balm for hold and shape"]
    },
    full: {
      styling: ["Apply beard butter for moisture", "Use a boar bristle brush", "Shape with heated beard straightener if needed"],
      faceShapes: ["Oval", "Round", "Triangle"],
      maintenance: ["Professional trim monthly", "Daily brushing required", "Use conditioner regularly"]
    }
  },
  shave: {
    classic: {
      styling: ["Apply pre-shave oil", "Use hot towel before shaving", "Finish with aftershave balm"],
      faceShapes: ["All face shapes"],
      maintenance: ["Moisturize daily", "Exfoliate 2-3 times per week", "Use sunscreen on clean-shaven skin"]
    }
  },
  kids: {
    default: {
      styling: ["Keep it simple and easy to manage", "Use gentle styling products", "Make it fun for the child"],
      faceShapes: ["Age-appropriate cuts for all face shapes"],
      maintenance: ["Trim every 4-6 weeks", "Use tear-free shampoo", "Regular combing to prevent tangles"]
    }
  },
  styling: {
    coloring: {
      styling: ["Use color-safe shampoo", "Avoid excessive heat styling", "Apply color-protecting serum"],
      faceShapes: ["All face shapes - color enhances any style"],
      maintenance: ["Touch up roots every 4-6 weeks", "Deep condition weekly", "Use purple shampoo for blondes"]
    }
  },
  default: {
    general: {
      styling: ["Consult your barber for personalized advice", "Use quality products suited to your hair type"],
      faceShapes: ["Consult with your barber for personalized advice"],
      maintenance: ["Regular maintenance keeps your look fresh", "Follow your barber's care instructions"]
    }
  }
};

// Map service names to imported images
const getServiceImage = (serviceName: string, category: string): string => {
  const lowerName = serviceName.toLowerCase();
  
  if (lowerName.includes('classic') || lowerName.includes('haircut') && category === 'Haircuts') return classicHaircut;
  if (lowerName.includes('fade') || lowerName.includes('modern')) return fade;
  if (lowerName.includes('beard')) return beardTrim;
  if (lowerName.includes('shave')) return shave;
  if (lowerName.includes('kids') || lowerName.includes('child')) return kids;
  if (lowerName.includes('color')) return coloring;
  if (lowerName.includes('combo')) return combo;
  if (lowerName.includes('juice')) return juice;
  if (lowerName.includes('tea')) return tea;
  if (lowerName.includes('coffee')) return coffee;
  if (lowerName.includes('round') || lowerName.includes('square') || lowerName.includes('oval')) return classicHaircut;
  
  // Default fallbacks by category
  if (category === 'Haircuts') return classicHaircut;
  if (category === 'Beard Services') return beardTrim;
  if (category === 'Shaves') return shave;
  if (category === 'Combos') return combo;
  if (category === 'Kids Services') return kids;
  if (category === 'Styling') return coloring;
  if (category === 'Beverages') return coffee;
  
  return classicHaircut;
};

const getAdviceForService = (serviceName: string, category: string): ServiceAdvice | null => {
  const lowerName = serviceName.toLowerCase();
  const lowerCategory = category.toLowerCase();
  
  // Haircuts
  if (lowerCategory.includes('haircut')) {
    if (lowerName.includes('classic')) return serviceAdvice.haircuts.classic;
    if (lowerName.includes('fade') || lowerName.includes('modern')) return serviceAdvice.haircuts.fade;
    return serviceAdvice.haircuts.modern;
  }
  
  // Beard Services
  if (lowerCategory.includes('beard')) {
    if (lowerName.includes('trim')) return serviceAdvice.beard.trim;
    return serviceAdvice.beard.full;
  }
  
  // Shaves
  if (lowerCategory.includes('shave')) {
    return serviceAdvice.shave.classic;
  }
  
  // Kids Services
  if (lowerCategory.includes('kids') || lowerCategory.includes('child')) {
    return serviceAdvice.kids.default;
  }
  
  // Styling/Coloring
  if (lowerCategory.includes('styling') || lowerName.includes('color')) {
    return serviceAdvice.styling.coloring;
  }
  
  // Combos - use general advice
  if (lowerCategory.includes('combo')) {
    return serviceAdvice.default.general;
  }
  
  return null;
};

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .neq('category', 'Beverages') // Exclude beverages
      .order('category', { ascending: true });

    if (data) {
      setServices(data);
    }
    setLoading(false);
  };

  const toggleServiceAdvice = (serviceId: string) => {
    setExpandedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-up">
            <Scissors className="h-16 w-16 text-primary mx-auto mb-6 animate-glow" />
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
              Our Services
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Premium grooming services tailored to perfection
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading services...</p>
            </div>
          ) : (
            <div className="space-y-16">
              {Object.entries(groupedServices).map(([category, categoryServices], index) => (
                <div key={category} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="h-1 w-12 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                      {category}
                    </h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {categoryServices.map((service, serviceIndex) => {
                      const advice = getAdviceForService(service.name, service.category);
                      const isExpanded = expandedServices.has(service.id);
                      
                      return (
                        <Card 
                          key={service.id} 
                          className="overflow-hidden hover:shadow-[var(--shadow-gold)] transition-all duration-500 group bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:-translate-y-2"
                          style={{ animationDelay: `${(index * 0.1) + (serviceIndex * 0.05)}s` }}
                        >
                          <div className="relative h-56 overflow-hidden">
                            <img 
                              src={getServiceImage(service.name, service.category)}
                              alt={service.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                            <div className="absolute top-4 right-4">
                              <div className="bg-primary/90 backdrop-blur-sm text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
                                {service.duration_minutes} min
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-6 space-y-4">
                            <h3 className="text-2xl font-bold group-hover:text-primary transition-colors duration-300">
                              {service.name}
                            </h3>
                            
                            <p className="text-muted-foreground line-clamp-2 leading-relaxed min-h-[3rem]">
                              {service.description}
                            </p>
                            
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-6 w-6 text-primary" />
                                <span className="text-3xl font-bold text-primary">${service.price}</span>
                              </div>
                              
                              <Link to="/booking" state={{ serviceId: service.id }}>
                                <Button className="gap-2 group-hover:shadow-lg transition-shadow">
                                  <Calendar className="h-4 w-4" />
                                  Book Now
                                </Button>
                              </Link>
                            </div>

                            {advice && (
                              <Collapsible open={isExpanded} onOpenChange={() => toggleServiceAdvice(service.id)}>
                                <CollapsibleTrigger className="w-full">
                                  <Button 
                                    variant="outline" 
                                    className="w-full mt-2 gap-2"
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    Styling Advice
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-4 space-y-4 text-sm">
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-primary">Styling Tips</h4>
                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                      {advice.styling.map((tip, i) => (
                                        <li key={i}>{tip}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-primary">Best for Face Shapes</h4>
                                    <p className="text-muted-foreground">{advice.faceShapes.join(", ")}</p>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-primary">Maintenance</h4>
                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                      {advice.maintenance.map((tip, i) => (
                                        <li key={i}>{tip}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link to="/booking">
              <Button size="lg" className="text-lg px-8 py-6">
                Book an Appointment
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Services;