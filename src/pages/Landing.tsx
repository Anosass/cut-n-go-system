import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, Star, Scissors } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import heroImage from "@/assets/hero-barbershop.jpg";
import haircutImage from "@/assets/service-haircut.jpg";
import beardImage from "@/assets/service-beard.jpg";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden pt-16">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        <div className="relative z-10 text-center px-4 animate-fade-up">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
            Prestige Barbershop
          </h1>
          <p className="text-xl md:text-2xl text-foreground/90 mb-8 max-w-2xl mx-auto">
            Premium grooming experience. Book your appointment and skip the wait.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/booking">
              <Button size="lg" className="text-lg px-8 py-6">
                <Calendar className="mr-2 h-5 w-5" />
                Book Appointment
              </Button>
            </Link>
            <Link to="/services">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                View Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center hover:shadow-[var(--shadow-gold)] transition-shadow">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Online Booking</h3>
              <p className="text-muted-foreground">
                Schedule your appointment 24/7. Choose your preferred time and barber.
              </p>
            </Card>

            <Card className="p-8 text-center hover:shadow-[var(--shadow-gold)] transition-shadow">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">No More Waiting</h3>
              <p className="text-muted-foreground">
                Skip the queue. Arrive on time and get straight to your service.
              </p>
            </Card>

            <Card className="p-8 text-center hover:shadow-[var(--shadow-gold)] transition-shadow">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Expert Barbers</h3>
              <p className="text-muted-foreground">
                Skilled professionals dedicated to delivering premium grooming services.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="overflow-hidden group cursor-pointer hover:shadow-[var(--shadow-gold)] transition-all">
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={haircutImage} 
                  alt="Classic Haircut" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2">Classic Haircut</h3>
                <p className="text-muted-foreground mb-4">
                  Traditional scissor and clipper cut with styling
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-primary text-xl font-bold">$35</span>
                  <span className="text-muted-foreground">30 min</span>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden group cursor-pointer hover:shadow-[var(--shadow-gold)] transition-all">
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={beardImage} 
                  alt="Beard Trim" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2">Beard Trim</h3>
                <p className="text-muted-foreground mb-4">
                  Professional beard shaping and grooming
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-primary text-xl font-bold">$20</span>
                  <span className="text-muted-foreground">15 min</span>
                </div>
              </div>
            </Card>
          </div>
          <div className="text-center mt-8">
            <Link to="/services">
              <Button size="lg" variant="outline">
                <Scissors className="mr-2 h-5 w-5" />
                View All Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready for a Fresh Look?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Book your appointment today and experience premium grooming at its finest
          </p>
          <Link to="/booking">
            <Button size="lg" className="text-lg px-8 py-6">
              <Calendar className="mr-2 h-5 w-5" />
              Book Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2024 Prestige Barbershop. All rights reserved.</p>
          <p className="mt-2">123 Main Street, Downtown | +1 (555) 123-4567</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;