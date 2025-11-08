import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LogOut, Package, TrendingUp, MapPin } from "lucide-react";
import { toast } from "sonner";

const RiderDashboard = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [riderProfile, setRiderProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchRiderProfile();
    fetchOrders();
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
      const { error } = await supabase
        .from("orders")
        .update({ order_status: status })
        .eq("id", activeOrder.id);

      if (error) throw error;
      toast.success("Order status updated!");
      fetchOrders();
    } catch (error: any) {
      toast.error("Failed to update status");
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
