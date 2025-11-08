import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Package, Truck } from "lucide-react";
import { toast } from "sonner";

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
    
    // Set up realtime subscription for order updates
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder(payload.new);
          toast.info(`Order status updated: ${payload.new.order_status}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error: any) {
      toast.error("Failed to fetch order");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: "bg-secondary",
      "rider-assigned": "bg-accent",
      "picked-up": "bg-primary",
      "in-transit": "bg-primary",
      delivered: "bg-success",
      cancelled: "bg-destructive",
    };
    return colors[status] || "bg-muted";
  };

  const statusSteps = [
    { key: "pending", label: "Order Placed" },
    { key: "rider-assigned", label: "Rider Assigned" },
    { key: "picked-up", label: "Picked Up" },
    { key: "in-transit", label: "In Transit" },
    { key: "delivered", label: "Delivered" },
  ];

  const getCurrentStepIndex = () => {
    return statusSteps.findIndex((step) => step.key === order?.order_status);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!order) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Order not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <Button variant="ghost" onClick={() => navigate("/customer/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
          <p className="text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
        </div>

        {/* Status Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
            <CardDescription>Real-time tracking of your delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex justify-between mb-8">
                {statusSteps.map((step, index) => {
                  const isActive = index <= getCurrentStepIndex();
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                          isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <p className={`text-sm text-center ${isActive ? "font-semibold" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-10">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${(getCurrentStepIndex() / (statusSteps.length - 1)) * 100}%` }}
                />
              </div>
            </div>
            <div className="mt-6 text-center">
              <Badge className={getStatusColor(order.order_status)} style={{ fontSize: "1rem", padding: "0.5rem 1rem" }}>
                {order.order_status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Map Placeholder */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Live Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg h-64 flex items-center justify-center">
              <p className="text-muted-foreground">Map tracking will be displayed here</p>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Locations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold mb-1">Pickup</p>
                <p className="text-sm text-muted-foreground">{order.pickup_address}</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Drop</p>
                <p className="text-sm text-muted-foreground">{order.drop_address}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-accent" />
                Package Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weight:</span>
                <span className="font-semibold">{order.package_weight}kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vehicle:</span>
                <span className="font-semibold capitalize">{order.vehicle_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distance:</span>
                <span className="font-semibold">{order.distance}km</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-muted-foreground">Total Fare:</span>
                <span className="text-2xl font-bold text-primary">₹{order.total_fare}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default OrderTracking;
