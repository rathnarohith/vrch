import { Button } from "@/components/ui/button";
import { Package, Truck, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
const Index = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero py-24 px-6">
        <div className="container mx-auto text-center text-white">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">India's Fastest Intra-City Delivery
Pick-up hua kya? 
smoothes<br />
            Hyperlocal Delivery
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">Lightning-fast package delivery across India. Book a rider in
seconds.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-white shadow-strong text-lg px-8" onClick={() => navigate("/auth")}>Order-now!</Button>
            <Button size="lg" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20 text-lg px-8" onClick={() => navigate("/auth?tab=rider")}>
              Become a Rider
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose Us?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard icon={<Zap className="w-12 h-12 text-primary" />} title="Lightning Fast" description="Get your package delivered in minutes, not hours" />
            <FeatureCard icon={<Package className="w-12 h-12 text-primary" />} title="Safe & Secure" description="All packages handled with utmost care" />
            <FeatureCard icon={<Truck className="w-12 h-12 text-primary" />} title="Real-Time Tracking" description="Track your delivery live on the map" />
            <FeatureCard icon={<Shield className="w-12 h-12 text-primary" />} title="₹5L Insurance" description="Every delivery is insured for peace of mind" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-muted">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers in Hyderabad
          </p>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-white shadow-medium text-lg px-8" onClick={() => navigate("/auth")}>
            Sign Up Now
          </Button>
        </div>
      </section>
    </div>;
};
const FeatureCard = ({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return <div className="bg-card rounded-xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 border border-border">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>;
};
export default Index;