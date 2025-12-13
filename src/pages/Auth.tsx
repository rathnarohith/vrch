import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { signUpSchema, signInSchema } from "@/lib/validations";
import { z } from "zod";

interface FormErrors {
  [key: string]: string;
}

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "rider" ? "rider" : "customer");
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/customer/dashboard");
      }
    });
  }, [navigate]);

  const validateSignUp = (data: {
    email: string;
    password: string;
    username: string;
    phone: string;
    vehicleType?: string;
  }) => {
    try {
      signUpSchema.parse(data);
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

  const validateSignIn = (data: { email: string; password: string }) => {
    try {
      signInSchema.parse(data);
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

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;
    const username = (formData.get("username") as string).trim();
    const phone = (formData.get("phone") as string).trim();
    const role = activeTab === "rider" ? "rider" : "customer";
    const vehicleType = formData.get("vehicleType") as string;

    if (!validateSignUp({ email, password, username, phone, vehicleType })) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            phone,
            role,
            ...(role === "rider" && { vehicle_type: vehicleType }),
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast.success("Account created successfully!");
      
      if (role === "rider") {
        navigate("/rider/dashboard");
      } else {
        navigate("/customer/dashboard");
      }
    } catch (error: any) {
      if (error.message?.includes("already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(error.message || "Failed to sign up");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim();
    const password = formData.get("password") as string;

    if (!validateSignIn({ email, password })) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const userRole = roles?.[0]?.role || "customer";

      toast.success("Signed in successfully!");
      
      if (userRole === "rider") {
        navigate("/rider/dashboard");
      } else if (userRole === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/customer/dashboard");
      }
    } catch (error: any) {
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.error(error.message || "Failed to sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  const clearErrors = () => setErrors({});

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>Login or create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); clearErrors(); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="rider">Rider</TabsTrigger>
            </TabsList>
            
            <TabsContent value="customer">
              <CustomerAuthForm
                onSignUp={handleSignUp}
                onSignIn={handleSignIn}
                loading={loading}
                errors={errors}
                clearErrors={clearErrors}
              />
            </TabsContent>
            
            <TabsContent value="rider">
              <RiderAuthForm
                onSignUp={handleSignUp}
                onSignIn={handleSignIn}
                loading={loading}
                errors={errors}
                clearErrors={clearErrors}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

interface AuthFormProps {
  onSignUp: (e: React.FormEvent<HTMLFormElement>) => void;
  onSignIn: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  errors: FormErrors;
  clearErrors: () => void;
}

const CustomerAuthForm = ({ onSignUp, onSignIn, loading, errors, clearErrors }: AuthFormProps) => {
  const [isSignUp, setIsSignUp] = useState(true);

  const toggleForm = () => {
    setIsSignUp(!isSignUp);
    clearErrors();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={isSignUp ? onSignUp : onSignIn} className="space-y-4">
        {isSignUp && (
          <>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" className={errors.username ? "border-destructive" : ""} />
              {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" type="tel" placeholder="e.g., 9876543210" className={errors.phone ? "border-destructive" : ""} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" className={errors.email ? "border-destructive" : ""} />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" className={errors.password ? "border-destructive" : ""} />
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          {isSignUp && (
            <p className="text-xs text-muted-foreground">
              Min 8 chars with uppercase, lowercase & number
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSignUp ? "Sign Up" : "Login"}
        </Button>
      </form>
      <Button variant="link" className="w-full" onClick={toggleForm}>
        {isSignUp ? "Already signed up? Login!!" : "Don't have an account? Sign Up"}
      </Button>
    </div>
  );
};

const RiderAuthForm = ({ onSignUp, onSignIn, loading, errors, clearErrors }: AuthFormProps) => {
  const [isSignUp, setIsSignUp] = useState(true);

  const toggleForm = () => {
    setIsSignUp(!isSignUp);
    clearErrors();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={isSignUp ? onSignUp : onSignIn} className="space-y-4">
        {isSignUp && (
          <>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" className={errors.username ? "border-destructive" : ""} />
              {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" type="tel" placeholder="e.g., 9876543210" className={errors.phone ? "border-destructive" : ""} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleType">Vehicle Type</Label>
              <Select name="vehicleType">
                <SelectTrigger className={errors.vehicleType ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bike">Bike (up to 15kg)</SelectItem>
                  <SelectItem value="trolley">Trolley (15kg+)</SelectItem>
                </SelectContent>
              </Select>
              {errors.vehicleType && <p className="text-sm text-destructive">{errors.vehicleType}</p>}
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" className={errors.email ? "border-destructive" : ""} />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" className={errors.password ? "border-destructive" : ""} />
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          {isSignUp && (
            <p className="text-xs text-muted-foreground">
              Min 8 chars with uppercase, lowercase & number
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSignUp ? "Sign Up as Rider" : "Login"}
        </Button>
      </form>
      <Button variant="link" className="w-full" onClick={toggleForm}>
        {isSignUp ? "Already signed up? Login!!" : "Don't have an account? Sign Up"}
      </Button>
    </div>
  );
};

export default Auth;
