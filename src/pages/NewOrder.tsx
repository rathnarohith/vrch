import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, MapPin, Package, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { orderSchema } from "@/lib/validations";
import { z } from "zod";

interface FormErrors {
  [key: string]: string;
}

const NewOrder = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    pickupAddress: "",
    pickupLat: 17.385,
    pickupLng: 78.4867,
    dropAddress: "",
    dropLat: 17.445,
    dropLng: 78.3489,
    packageWeight: "",
    vehicleType: "bike",
    paymentMethod: "cash_on_delivery",
  });
  const [fareEstimate, setFareEstimate] = useState<any>(null);

  const validateForm = () => {
    try {
      orderSchema.parse({
        pickupAddress: formData.pickupAddress.trim(),
        dropAddress: formData.dropAddress.trim(),
        packageWeight: parseFloat(formData.packageWeight) || 0,
        vehicleType: formData.vehicleType,
        paymentMethod: formData.paymentMethod,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const calculateFare = () => {
    if (!validateForm()) {
      toast.error("Please fix the errors before calculating fare");
      return;
    }

    const weight = parseFloat(formData.packageWeight);
    const distance = 5; // Mock distance for now
    
    let weightCost = 0;
    let distanceCost = 0;

    if (formData.vehicleType === "bike") {
      weightCost = weight <= 5 ? 5 : 5 + (weight - 5) * 3;
      distanceCost = distance <= 5 ? 20 : 20 + (distance - 5) * 15;
    } else {
      weightCost = weight <= 10 ? 15 : 15 + (weight - 10) * 8;
      distanceCost = distance * 20;
    }

    const total = weightCost + distanceCost;
    setFareEstimate({
      weightCost,
      distanceCost,
      total,
      distance,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }

    if (!fareEstimate) {
      toast.error("Please calculate fare first");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (formData.paymentMethod === "online") {
        toast.info("Processing payment...");
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success("Payment successful!");
      }

      const { error } = await supabase.from("orders").insert({
        customer_id: user.id,
        pickup_address: formData.pickupAddress.trim(),
        pickup_lat: formData.pickupLat,
        pickup_lng: formData.pickupLng,
        drop_address: formData.dropAddress.trim(),
        drop_lat: formData.dropLat,
        drop_lng: formData.dropLng,
        package_weight: parseFloat(formData.packageWeight),
        vehicle_type: formData.vehicleType,
        distance: fareEstimate.distance,
        total_fare: fareEstimate.total,
        payment_method: formData.paymentMethod,
        payment_status: formData.paymentMethod === "online" ? "completed" : "pending",
        order_status: "pending",
      });

      if (error) throw error;

      toast.success("Order created successfully!");
      navigate("/customer/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
    // Reset fare estimate when form changes
    setFareEstimate(null);
  };

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

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">New Delivery Order</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Pickup Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="pickupAddress">Address</Label>
                <Input
                  id="pickupAddress"
                  placeholder="Enter pickup address in Hyderabad"
                  value={formData.pickupAddress}
                  onChange={(e) => updateField("pickupAddress", e.target.value)}
                  className={errors.pickupAddress ? "border-destructive" : ""}
                />
                {errors.pickupAddress && (
                  <p className="text-sm text-destructive">{errors.pickupAddress}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-secondary" />
                Drop Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="dropAddress">Address</Label>
                <Input
                  id="dropAddress"
                  placeholder="Enter drop address in Hyderabad"
                  value={formData.dropAddress}
                  onChange={(e) => updateField("dropAddress", e.target.value)}
                  className={errors.dropAddress ? "border-destructive" : ""}
                />
                {errors.dropAddress && (
                  <p className="text-sm text-destructive">{errors.dropAddress}</p>
                )}
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
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Package Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="500"
                  placeholder="Enter weight (0.1 - 500 kg)"
                  value={formData.packageWeight}
                  onChange={(e) => updateField("packageWeight", e.target.value)}
                  className={errors.packageWeight ? "border-destructive" : ""}
                />
                {errors.packageWeight && (
                  <p className="text-sm text-destructive">{errors.packageWeight}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <RadioGroup
                  value={formData.vehicleType}
                  onValueChange={(value) => updateField("vehicleType", value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bike" id="bike" />
                    <Label htmlFor="bike" className="font-normal">
                      Bike (up to 15kg)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="trolley" id="trolley" />
                    <Label htmlFor="trolley" className="font-normal">
                      Trolley (15kg+)
                    </Label>
                  </div>
                </RadioGroup>
                {errors.vehicleType && (
                  <p className="text-sm text-destructive">{errors.vehicleType}</p>
                )}
              </div>

              {formData.packageWeight && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={calculateFare}
                  className="w-full"
                >
                  Calculate Fare
                </Button>
              )}

              {fareEstimate && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Weight Charge:</span>
                    <span className="font-semibold">₹{fareEstimate.weightCost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Distance Charge ({fareEstimate.distance}km):</span>
                    <span className="font-semibold">₹{fareEstimate.distanceCost}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-primary border-t pt-2">
                    <span>Total Fare:</span>
                    <span>₹{fareEstimate.total}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Method
              </CardTitle>
              <CardDescription>Choose how you want to pay for this delivery</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.paymentMethod}
                onValueChange={(value) => updateField("paymentMethod", value)}
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="cash_on_delivery" id="cod" />
                  <Label htmlFor="cod" className="font-normal flex-1 cursor-pointer">
                    <div className="font-medium">Cash on Delivery</div>
                    <div className="text-sm text-muted-foreground">Pay when order is delivered</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online" className="font-normal flex-1 cursor-pointer">
                    <div className="font-medium">Pay Now (Online)</div>
                    <div className="text-sm text-muted-foreground">Instant payment - simulated for demo</div>
                  </Label>
                </div>
              </RadioGroup>
              {errors.paymentMethod && (
                <p className="text-sm text-destructive mt-2">{errors.paymentMethod}</p>
              )}
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full bg-secondary hover:bg-secondary/90"
            size="lg"
            disabled={loading || !fareEstimate}
          >
            {loading ? "Creating Order..." : formData.paymentMethod === "online" ? "Pay & Book Now" : "Book Now"}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default NewOrder;
