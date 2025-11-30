import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, LogOut, MapPin, XCircle, Quote } from "lucide-react";
import { toast } from "sonner";

const motivationalQuotes = [
  "Great things take time. Your order is on its way!",
  "Every journey begins with a single step. Track yours!",
  "Excellence in delivery, every single time.",
  "Your time is valuable. We deliver fast!",
  "Sit back and relax. We've got this covered.",
];

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [quote] = useState(() => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);

  useEffect(() => {
    checkAuth();
    fetchOrders();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ order_status: "cancelled" })
        .eq("id", orderId)
        .eq("order_status", "pending");

      if (error) throw error;
      toast.success("Order cancelled successfully");
      fetchOrders();
    } catch (error: any) {
      toast.error("Failed to cancel order");
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">QuickDeliver</h1>
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Motivational Quote */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <Quote className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
              <p className="text-lg font-medium text-foreground italic">{quote}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">My Orders</h2>
            <p className="text-muted-foreground">Track and manage your deliveries</p>
          </div>
          <Button
            size="lg"
            className="bg-secondary hover:bg-secondary/90"
            onClick={() => navigate("/customer/new-order")}
          >
            <Plus className="w-5 h-5 mr-2" />
            New Order
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading orders...</div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground mb-6">Create your first delivery order</p>
              <Button onClick={() => navigate("/customer/new-order")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-medium transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                      <CardDescription>
                        {new Date(order.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(order.order_status)}>
                      {order.order_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Pickup</p>
                        <p className="text-sm text-muted-foreground">{order.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-secondary mt-0.5" />
                      <div>
                        <p className="font-medium">Drop</p>
                        <p className="text-sm text-muted-foreground">{order.drop_address}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Fare</p>
                        <p className="text-2xl font-bold text-primary">₹{order.total_fare}</p>
                      </div>
                      <div className="flex gap-2">
                        {order.order_status === "pending" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        )}
                        {order.order_status !== "delivered" && order.order_status !== "cancelled" && (
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/customer/track/${order.id}`)}
                          >
                            Track Order
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;
