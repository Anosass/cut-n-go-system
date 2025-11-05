import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

interface CartItem {
  id: string;
  service_id: string;
  quantity: number;
  services: {
    name: string;
    price: number;
  };
}

export const BeverageCart = ({ userId }: { userId: string }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCart();

    // Real-time subscription
    const channel = supabase
      .channel('cart-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchCart();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchCart = async () => {
    const { data } = await supabase
      .from('cart_items')
      .select(`
        id,
        service_id,
        quantity,
        services (
          name,
          price
        )
      `)
      .eq('user_id', userId);

    if (data) {
      setCartItems(data as CartItem[]);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeItem(itemId);
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: newQuantity })
      .eq('id', itemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const removeItem = async (itemId: string) => {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    }
  };

  const checkout = async () => {
    if (cartItems.length === 0) return;

    setLoading(true);

    // Create beverage orders as appointments
    const orders = cartItems.map((item) => ({
      customer_id: userId,
      service_id: item.service_id,
      barber_id: null,
      appointment_date: new Date().toISOString().split('T')[0],
      appointment_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      notes: `Beverage order - Quantity: ${item.quantity}`,
      status: 'pending'
    }));

    const { error } = await supabase
      .from('appointments')
      .insert(orders);

    if (error) {
      toast({
        title: "Checkout failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Clear cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    setLoading(false);
    setOpen(false);
    
    toast({
      title: "Order placed!",
      description: "Your beverage order has been submitted successfully",
    });
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + (item.services?.price || 0) * item.quantity,
    0
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative gap-2">
          <ShoppingCart className="h-5 w-5" />
          <span className="hidden sm:inline">Cart</span>
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 rounded-full">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
          <SheetDescription>
            {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {cartItems.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.services?.name}</h4>
                        <p className="text-sm text-primary font-bold">
                          ${item.services?.price}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-7 w-7 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-7 w-7 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-bold text-lg">
                        ${((item.services?.price || 0) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary text-2xl">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>

                <Button
                  onClick={checkout}
                  disabled={loading || cartItems.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Processing..." : "Checkout"}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
