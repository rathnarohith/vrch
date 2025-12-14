import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LogOut, Package, TrendingUp, MapPin, Quote } from "lucide-react";
import { toast } from "sonner";

const ridingQuotes = [
  "The road is calling. Let's deliver excellence!",
  "Every delivery is a promise kept. Ride safe!",
  "Your wheels, their smiles. Keep rolling!",
  "Speed with safety, service with a smile.",
  "The best riders deliver more than packages - they deliver trust.",
];

const RiderDashboard = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [riderProfile, setRiderProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);
  const [quote] = useState(() => ridingQuotes[Math.floor(Math.random() * ridingQuotes.length)]);

  useEffect(() => {
    checkAuth();
    fetchRiderProfile();
    fetchOrders();

    // Subscribe to order cancellations in real-time
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('order-cancellations')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `rider_id=eq.${user.id}`
          },
          (payload) => {
            const newOrder = payload.new as any;
            if (newOrder.order_status === 'cancelled') {
              toast.error(`Order cancelled by customer`, {
                description: newOrder.cancellation_reason 
                  ? `Reason: ${newOrder.cancellation_reason.replace(/_/g, ' ')}`
                  : 'The customer has cancelled this order.',
                duration: 6000
              });
              // Refresh orders list
              fetchOrders();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeSubscription();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchRiderProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("rider_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      setRiderProfile(data);
      setIsOnline(data.is_online);
    } catch (error: any) {
      toast.error("Failed to fetch profile");
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch available orders
      const { data: available } = await supabase
        .from("orders")
        .select("*")
        .eq("order_status", "pending")
        .order("created_at", { ascending: false });

      setAvailableOrders(available || []);

      // Fetch cancelled orders assigned to this rider
      const { data: cancelled } = await supabase
        .from("orders")
        .select("*")
        .eq("rider_id", user?.id)
        .eq("order_status", "cancelled")
        .order("updated_at", { ascending: false });

      setCancelledOrders(cancelled || []);

      // Fetch active order
      const { data: active } = await supabase
        .from("orders")
        .select("*")
        .eq("rider_id", user?.id)
        .in("order_status", ["rider-assigned", "picked-up", "in-transit"])
        .single();

      setActiveOrder(active);
    } catch (error: any) {
      // No active order
    } finally {
      setLoading(false);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("rider_profiles")
        .update({ is_online: !isOnline })
        .eq("user_id", user?.id);

      if (error) throw error;
      setIsOnline(!isOnline);
      toast.success(isOnline ? "You are now offline" : "You are now online");
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const acceptOrder = async (orderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("orders")
        .update({
          rider_id: user?.id,
          order_status: "rider-assigned",
        })
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Order accepted!");
      fetchOrders();
    } catch (error: any) {
      toast.error("Failed to accept order");
    }
  };

  const updateOrderStatus = async (status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("orders")
        .update({ order_status: status })
        .eq("id", activeOrder.id);

      if (error) throw error;

      // If delivered, update rider earnings
      if (status === "delivered" && user) {
        const riderEarnings = activeOrder.total_fare * 0.75;
        const { error: profileError } = await supabase
          .from("rider_profiles")
          .update({
            earnings: (riderProfile?.earnings || 0) + riderEarnings,
            total_distance: (riderProfile?.total_distance || 0) + activeOrder.distance
          })
          .eq("user_id", user.id);

        if (profileError) {
          console.error("Failed to update earnings:", profileError);
        } else {
          fetchRiderProfile();
        }
      }

      toast.success("Order status updated!");
      fetchOrders();
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const reclaimCancelledOrder = async (order: any) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          order_status: "pending",
          rider_id: null,
          cancellation_reason: null
        })
        .eq("id", order.id);

      if (error) throw error;
      toast.success("Order released back to available orders!");
      fetchOrders();
    } catch (error: any) {
      toast.error("Failed to release order");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Rider Dashboard</h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Riding Quote */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <Quote className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
              <p className="text-lg font-medium text-foreground italic">{quote}</p>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="mb-8 bg-gradient-primary text-white">
          <CardContent className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold mb-2">
                  {isOnline ? "You're Online" : "You're Offline"}
                </h3>
                <p className="text-white/90">
                  Toggle to start accepting deliveries
                </p>
              </div>
              <Switch
                checked={isOnline}
                onCheckedChange={toggleOnlineStatus}
                className="scale-150"
              />
            </div>
          </CardContent>
        </Card>

        {/* Earnings Card */}
        {riderProfile && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">
                  ₹{riderProfile.earnings}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Distance: {riderProfile.total_distance}km
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vehicle</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="text-lg">{riderProfile.vehicle_type}</Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  {riderProfile.incentives}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Order */}
        {activeOrder && (
          <Card className="mb-8 border-primary">
            <CardHeader>
              <CardTitle>Active Delivery</CardTitle>
              <CardDescription>Order #{activeOrder.id.slice(0, 8)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Pickup</p>
                    <p className="text-sm text-muted-foreground">{activeOrder.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-secondary mt-0.5" />
                  <div>
                    <p className="font-medium">Drop</p>
                    <p className="text-sm text-muted-foreground">{activeOrder.drop_address}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {activeOrder.order_status === "rider-assigned" && (
                  <Button
                    className="flex-1"
                    onClick={() => updateOrderStatus("picked-up")}
                  >
                    Mark Picked Up
                  </Button>
                )}
                {activeOrder.order_status === "picked-up" && (
                  <Button
                    className="flex-1"
                    onClick={() => updateOrderStatus("in-transit")}
                  >
                    Start Transit
                  </Button>
                )}
                {activeOrder.order_status === "in-transit" && (
                  <Button
                    className="flex-1 bg-success hover:bg-success/90"
                    onClick={() => updateOrderStatus("delivered")}
                  >
                    Mark Delivered
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancelled Orders Toggle */}
        {cancelledOrders.length > 0 && (
          <div className="mb-8">
            <Button
              variant={showCancelled ? "default" : "outline"}
              onClick={() => setShowCancelled(!showCancelled)}
              className="mb-4"
            >
              {showCancelled ? "Hide" : "Show"} Cancelled Orders ({cancelledOrders.length})
            </Button>

            {showCancelled && (
              <div className="grid gap-4">
                {cancelledOrders.map((order) => (
                  <Card key={order.id} className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            Order #{order.id.slice(0, 8)}
                            <Badge variant="destructive">Cancelled</Badge>
                          </CardTitle>
                          <CardDescription>
                            {order.package_weight}kg • {order.vehicle_type}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Was worth</p>
                          <p className="text-xl font-bold text-muted-foreground line-through">
                            ₹{(order.total_fare * 0.75).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <p className="text-sm">
                          <span className="font-medium">Pickup:</span> {order.pickup_address}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Drop:</span> {order.drop_address}
                        </p>
                        {order.cancellation_reason && (
                          <p className="text-sm text-destructive">
                            <span className="font-medium">Reason:</span> {order.cancellation_reason.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => reclaimCancelledOrder(order)}
                      >
                        Release Back to Available
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Available Orders */}
        {isOnline && !activeOrder && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Available Orders</h2>
            {availableOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No orders available</h3>
                  <p className="text-muted-foreground">Check back soon for new deliveries</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {availableOrders.map((order) => (
                  <Card key={order.id} className="hover:shadow-medium transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
                          <CardDescription>
                            {order.package_weight}kg • {order.vehicle_type}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">You'll Earn</p>
                          <p className="text-2xl font-bold text-success">
                            ₹{(order.total_fare * 0.75).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <p className="text-sm">
                          <span className="font-medium">Pickup:</span> {order.pickup_address}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Drop:</span> {order.drop_address}
                        </p>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => acceptOrder(order.id)}
                      >
                        Accept Order
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default RiderDashboard;
