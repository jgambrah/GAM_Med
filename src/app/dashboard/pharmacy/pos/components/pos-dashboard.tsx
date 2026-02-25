'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { mockInventory as initialInventory, mockPricingTables } from '@/lib/data';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Invoice, InventoryItem } from '@/lib/types';
import { PaymentDialog } from '@/app/dashboard/patients/[patientId]/components/payment-dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useAuth } from '@/hooks/use-auth';

interface CartItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const getPrice = (itemId: string): number => {
    const item = initialInventory.find(i => i.itemId === itemId);
    const privateTier = mockPricingTables.find(t => t.pricingId === 'private');
    const billingCode = item?.itemId; 
    if (billingCode && privateTier && privateTier.rate_card[billingCode]) {
        return privateTier.rate_card[billingCode];
    }
    return item ? 10 : 0;
}

export function PointOfSaleDashboard() {
  const { user } = useAuth();
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<string | undefined>();
  const [finalizedInvoice, setFinalizedInvoice] = React.useState<Invoice | null>(null);
  const [mockInventory] = useLocalStorage<InventoryItem[]>('inventory', initialInventory);

  const inventoryOptions = mockInventory.map(item => ({
    value: item.itemId,
    label: `${item.name} (Stock: ${item.currentQuantity})`,
  }));

  const handleAddItem = () => {
    if (!selectedItem) {
      toast.error('Please select an item to add.');
      return;
    }

    const existingCartItem = cart.find(item => item.itemId === selectedItem);
    if (existingCartItem) {
      toast.info('Item is already in the cart.');
      return;
    }
    
    const inventoryItem = mockInventory.find(item => item.itemId === selectedItem);
    if (!inventoryItem) {
      toast.error('Selected item not found in inventory.');
      return;
    }

    const newItem: CartItem = {
      itemId: inventoryItem.itemId,
      name: inventoryItem.name,
      quantity: 1,
      unitPrice: getPrice(inventoryItem.itemId),
      totalPrice: getPrice(inventoryItem.itemId),
    };

    setCart(prevCart => [...prevCart, newItem]);
    setSelectedItem(undefined);
  };
  
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    setCart(prevCart => prevCart.map(item => {
        if (item.itemId === itemId) {
            return { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity };
        }
        return item;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.itemId !== itemId));
  };
  
  const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
        toast.error("Cannot check out with an empty cart.");
        return;
    }

    const mockInvoice: Invoice = {
      invoiceId: `POS-INV-${Date.now()}`,
      hospitalId: user?.hospitalId || '',
      patientId: 'OTC-CUSTOMER', 
      patientName: 'Over-the-Counter Customer',
      patientType: 'private',
      issueDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      billedItems: cart.map(item => ({
        serviceType: 'Pharmacy Retail',
        linkedServiceId: item.itemId,
        billingCode: 'PHARM-OTC',
        price: item.totalPrice,
      })),
      subtotal: subtotal,
      vatOption: 'zero',
      vat: 0,
      nhia: 0,
      getfund: 0,
      covidLevy: 0,
      totalTax: 0,
      grandTotal: subtotal,
      amountDue: subtotal,
      status: 'Pending Payment',
    };
    
    setFinalizedInvoice(mockInvoice);
    toast.success("Invoice Generated");
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Point of Sale (POS)</CardTitle>
        <CardDescription>
          Over-the-counter sales for <strong>{user?.hospitalId}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
            <div className="flex items-end gap-2">
                 <div className="flex-grow">
                     <label className="text-sm font-medium">Add Item to Cart</label>
                    <Combobox
                        options={inventoryOptions}
                        value={selectedItem}
                        onChange={setSelectedItem}
                        placeholder="Search inventory..."
                        searchPlaceholder="Search items..."
                        notFoundText="No item found."
                    />
                 </div>
                <Button onClick={handleAddItem}><Plus className="h-4 w-4 mr-2" /> Add</Button>
            </div>
            <div className="rounded-md border h-96 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="w-24">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cart.length > 0 ? cart.map(item => (
                            <TableRow key={item.itemId}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        value={item.quantity}
                                        onChange={(e) => handleQuantityChange(item.itemId, parseInt(e.target.value) || 1)}
                                        min="1"
                                        className="h-8"
                                    />
                                </TableCell>
                                <TableCell className="text-right font-mono">₵{item.unitPrice.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono">₵{item.totalPrice.toFixed(2)}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveItem(item.itemId)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    The cart is empty.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
        <div className="lg:col-span-1 space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-lg font-semibold">Order Summary</h3>
            <Separator />
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono">₵{subtotal.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                    <span>Taxes</span>
                    <span className="font-mono">₵0.00</span>
                </div>
            </div>
            <Separator />
            <div className="flex justify-between text-xl font-bold">
                <span>Grand Total</span>
                <span className="font-mono">₵{subtotal.toFixed(2)}</span>
            </div>
            <Button className="w-full" onClick={handleCheckout} disabled={cart.length === 0 || !!finalizedInvoice}>
                {finalizedInvoice ? 'Invoice Generated' : 'Generate Invoice & Checkout'}
            </Button>
            {finalizedInvoice && (
                <div className="text-center">
                    <p className="text-sm text-muted-foreground my-2">Invoice {finalizedInvoice.invoiceId} is ready.</p>
                     <PaymentDialog invoice={finalizedInvoice} />
                </div>
            )}
        </div>
      </CardContent>
    </Card>
    </>
  );
}
