import { Request, Response } from 'express';
import StoreProduct from '../models/StoreProduct';
import Product from '../models/Product';
import Store from '../models/Store';
import { isPopulatedProduct } from '../models/StoreProduct';

export const getAllStoreProducts = async (req: Request, res: Response) => {
  try {
    const storeProducts = await StoreProduct.find()
      .populate('productId')
      .populate('storeId')
      .exec();
    let skipped = 0;
    // Use type guard to filter only valid/populated storeProducts
    const items = storeProducts
      .filter(isPopulatedProduct)
      .filter(sp => sp.storeId && typeof sp.storeId === 'object' && 'name' in sp.storeId && '_id' in sp.storeId)
      .map(sp => {
        const prod = (sp.productId as any).toObject();
        return {
          ...prod,
          _id: prod._id.toString(),
          id: prod._id.toString(),
          price: sp.price,
          quantity: sp.quantity,
          storeId: (sp.storeId as any)._id.toString(),
          storeName: (sp.storeId as any).name,
          storeProductId: (typeof sp._id === 'object' && sp._id !== null && 'toString' in sp._id) ? sp._id.toString() : String(sp._id)
        };
      });
    skipped = storeProducts.length - items.length;
    if (skipped > 0) {
      console.warn(`[getAllStoreProducts] Skipped ${skipped} storeProducts due to missing or invalid productId or storeId.`);
    }
    res.json({ success: true, data: { items }, error: null });
  } catch (err: any) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
}; 