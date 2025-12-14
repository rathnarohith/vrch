import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Package, Plus, LogOut, MapPin, XCircle, Quote, Search, Filter, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { useOrderNotifications } from "@/hooks/use-notifications";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");

  const { permission, requestPermission, isSupported } = useOrderNotifications({
    userId: user?.id || null,
    enabled: true,
  });

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

  const openCancelDialog = (orderId: string) => {
    setOrderToCancel(orderId);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel || !cancelReason) return;
    
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          order_status: "cancelled",
          cancellation_reason: cancelReason 
        })
        .eq("id", orderToCancel);

      if (error) throw error;
      toast.success("Order cancelled successfully");
      fetchOrders();
    } catch (error: any) {
      toast.error("Failed to cancel order");
    } finally {
      setCancelDialogOpen(false);
      setOrderToCancel(null);
      setCancelReason("");
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

  // Filter and sort orders
  const filteredOrders = orders
    .filter((order) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        order.id.toLowerCase().includes(searchLower) ||
        order.pickup_address.toLowerCase().includes(searchLower) ||
        order.drop_address.toLowerCase().includes(searchLower) ||
        order.order_status.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === "all" || order.order_status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "fare-high":
          return b.total_fare - a.total_fare;
        case "fare-low":
          return a.total_fare - b.total_fare;
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">QuickDeliver</h1>
          <div className="flex gap-4">
            {isSupported && (
              <Button
                variant={permission === 'granted' ? 'default' : 'outline'}
                onClick={requestPermission}
                title={permission === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
              >
                {permission === 'granted' ? (
                  <Bell className="w-4 h-4 mr-2" />
                ) : (
                  <BellOff className="w-4 h-4 mr-2" />
                )}
                {permission === 'granted' ? 'Notifications On' : 'Enable Notifications'}
              </Button>
            )}
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

        <div className="flex flex-col gap-6 mb-8">
          <div className="flex justify-between items-center">
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

          {/* Search and Filters */}
          {orders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="w-5 h-5" />
                  Search & Filter Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rider-assigned">Rider Assigned</SelectItem>
                      <SelectItem value="picked-up">Picked Up</SelectItem>
                      <SelectItem value="in-transit">In Transit</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Sort */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="fare-high">Fare: High to Low</SelectItem>
                      <SelectItem value="fare-low">Fare: Low to High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Filters Summary */}
                {(searchQuery || statusFilter !== "all") && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredOrders.length} of {orders.length} orders
                    </p>
                    {(searchQuery || statusFilter !== "all") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("all");
                        }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No orders found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your search or filters</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredOrders.map((order) => (
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
                        {(order.order_status === "pending" || order.order_status === "rider-assigned") && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openCancelDialog(order.id)}
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

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Please select a reason for cancellation. This helps us improve our service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={cancelReason} onValueChange={setCancelReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="changed_mind">Changed my mind</SelectItem>
                <SelectItem value="found_alternative">Found alternative delivery</SelectItem>
                <SelectItem value="wrong_address">Entered wrong address</SelectItem>
                <SelectItem value="price_too_high">Price too high</SelectItem>
                <SelectItem value="taking_too_long">Taking too long to find rider</SelectItem>
                <SelectItem value="ordered_by_mistake">Ordered by mistake</SelectItem>
                <SelectItem value="other">Other reason</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep order</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={!cancelReason}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomerDashboard;
