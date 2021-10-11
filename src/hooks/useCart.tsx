import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
        const cartCopy = cart.slice();
        const productExists = cartCopy.find(product => product.id === productId);

        const stock = await api.get(`/stock/${productId}`);
        const stockAmount = stock.data.amount;

        const currentAmount = productExists ? productExists.amount : 0;

        const amount = currentAmount + 1;

        if (amount > stockAmount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        if (productExists) {
          productExists.amount = amount;
        } else {
          const product = await api.get(`/products/${productId}`);

          const newProduct = {
            ...product.data,
            amount: 1,
          }
          
          cartCopy.push(newProduct);

        }

        setCart(cartCopy);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartCopy));
      
    } catch(err) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartCopy = cart.slice();
      const productIndex = cartCopy.findIndex(product => product.id === productId);
      if ( productIndex >=0 ) {
        cartCopy.splice(productIndex, 1);
      
        setCart(cartCopy);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartCopy));

      } else {
        throw Error();
      }
      
    } catch (err) {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {

    try {

      if (amount <= 0) return;

      const responseStock = await api.get<Stock>(`/stock/${productId}`);
      const productStockAmount = responseStock.data.amount;
      
      if (amount > productStockAmount){

        toast.error('Quantidade solicitada fora de estoque');
        return;

      }

      const cartCopy = cart.slice();
      const updateProduct = cartCopy.find(product => product.id === productId );

      if (updateProduct) {
        updateProduct.amount = amount;

        setCart(cartCopy);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
      } else {
        throw Error();
      }
      

    } catch (err) {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
