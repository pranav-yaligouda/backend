import mongoose from 'mongoose';
import Product, { ALLOWED_CATEGORIES } from '../models/Product';

const initialProducts = [
  // Vegetables
  { name: 'Potato', category: 'Vegetables', unit: 'kg' },
  { name: 'Tomato', category: 'Vegetables', unit: 'kg' },
  { name: 'Onion', category: 'Vegetables', unit: 'kg' },
  { name: 'Carrot', category: 'Vegetables', unit: 'kg' },
  { name: 'Cabbage', category: 'Vegetables', unit: 'kg' },
  { name: 'Cauliflower', category: 'Vegetables', unit: 'kg' },
  { name: 'Spinach', category: 'Vegetables', unit: 'kg' },
  { name: 'Green Peas', category: 'Vegetables', unit: 'kg' },
  { name: 'Brinjal', category: 'Vegetables', unit: 'kg' },
  { name: 'Capsicum', category: 'Vegetables', unit: 'kg' },
  // Fruits
  { name: 'Apple', category: 'Fruits', unit: 'kg' },
  { name: 'Banana', category: 'Fruits', unit: 'kg' },
  { name: 'Orange', category: 'Fruits', unit: 'kg' },
  { name: 'Mango', category: 'Fruits', unit: 'kg' },
  { name: 'Grapes', category: 'Fruits', unit: 'kg' },
  { name: 'Watermelon', category: 'Fruits', unit: 'kg' },
  { name: 'Papaya', category: 'Fruits', unit: 'kg' },
  { name: 'Pineapple', category: 'Fruits', unit: 'kg' },
  { name: 'Pomegranate', category: 'Fruits', unit: 'kg' },
  { name: 'Guava', category: 'Fruits', unit: 'kg' },
  // Groceries
  { name: 'Rice', category: 'Groceries', unit: 'kg' },
  { name: 'Wheat Flour', category: 'Groceries', unit: 'kg' },
  { name: 'Sugar', category: 'Groceries', unit: 'kg' },
  { name: 'Salt', category: 'Groceries', unit: 'kg' },
  { name: 'Cooking Oil', category: 'Groceries', unit: 'litres' },
  { name: 'Pulses', category: 'Groceries', unit: 'kg' },
  { name: 'Tea', category: 'Groceries', unit: 'grams' },
  { name: 'Coffee', category: 'Groceries', unit: 'grams' },
  { name: 'Spices', category: 'Groceries', unit: 'grams' },
  { name: 'Lentils', category: 'Groceries', unit: 'kg' },
  // Medicines
  { name: 'Paracetamol', category: 'Medicines', unit: 'pieces' },
  { name: 'Ibuprofen', category: 'Medicines', unit: 'pieces' },
  { name: 'Cough Syrup', category: 'Medicines', unit: 'ml' },
  { name: 'Antiseptic Cream', category: 'Medicines', unit: 'grams' },
  { name: 'Bandages', category: 'Medicines', unit: 'pieces' },
  { name: 'Vitamin C Tablets', category: 'Medicines', unit: 'pieces' },
  { name: 'Pain Relief Balm', category: 'Medicines', unit: 'grams' },
  { name: 'Thermometer', category: 'Medicines', unit: 'pieces' },
  { name: 'ORS Sachets', category: 'Medicines', unit: 'pieces' },
  { name: 'Antacid Tablets', category: 'Medicines', unit: 'pieces' },
  // Dairy
  { name: 'Milk', category: 'Dairy', unit: 'litres' },
  { name: 'Curd', category: 'Dairy', unit: 'kg' },
  { name: 'Butter', category: 'Dairy', unit: 'grams' },
  { name: 'Cheese', category: 'Dairy', unit: 'grams' },
  { name: 'Paneer', category: 'Dairy', unit: 'grams' },
  { name: 'Ghee', category: 'Dairy', unit: 'grams' },
  { name: 'Lassi', category: 'Dairy', unit: 'ml' },
  { name: 'Buttermilk', category: 'Dairy', unit: 'ml' },
  { name: 'Cream', category: 'Dairy', unit: 'grams' },
  { name: 'Flavored Milk', category: 'Dairy', unit: 'ml' },
  // Household
  { name: 'Detergent Powder', category: 'Household', unit: 'kg' },
  { name: 'Dishwashing Liquid', category: 'Household', unit: 'ml' },
  { name: 'Floor Cleaner', category: 'Household', unit: 'ml' },
  { name: 'Toilet Cleaner', category: 'Household', unit: 'ml' },
  { name: 'Broom', category: 'Household', unit: 'pieces' },
  { name: 'Mop', category: 'Household', unit: 'pieces' },
  { name: 'Garbage Bags', category: 'Household', unit: 'pieces' },
  { name: 'Air Freshener', category: 'Household', unit: 'ml' },
  { name: 'Sponges', category: 'Household', unit: 'pieces' },
  { name: 'Paper Towels', category: 'Household', unit: 'pieces' },
  // Stationary
  { name: 'Notebook', category: 'Stationary', unit: 'pieces' },
  { name: 'Pen', category: 'Stationary', unit: 'pieces' },
  { name: 'Pencil', category: 'Stationary', unit: 'pieces' },
  { name: 'Eraser', category: 'Stationary', unit: 'pieces' },
  { name: 'Sharpener', category: 'Stationary', unit: 'pieces' },
  { name: 'Ruler', category: 'Stationary', unit: 'pieces' },
  { name: 'Marker', category: 'Stationary', unit: 'pieces' },
  { name: 'Highlighter', category: 'Stationary', unit: 'pieces' },
  { name: 'Glue Stick', category: 'Stationary', unit: 'pieces' },
  { name: 'Stapler', category: 'Stationary', unit: 'pieces' },
];

async function seedProducts() {
  await mongoose.connect('mongodb://localhost:27017/AthaniMart'); // Update as needed
  for (const prod of initialProducts) {
    await Product.updateOne(
      { name: prod.name, category: prod.category },
      { $setOnInsert: prod },
      { upsert: true }
    );
  }
  console.log('Product catalog seeded!');
  await mongoose.disconnect();
}

seedProducts();
