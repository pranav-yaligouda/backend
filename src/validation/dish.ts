import { z } from 'zod';

export const dishSchema = z.object({
  mealType: z.string().min(1, 'Meal type is required'),
  cuisineType: z.string().min(1, 'Cuisine type is required'),
  category: z.string().min(1, 'Category is required'),
  dishName: z.string().min(1, 'Dish name is required'),
  dietaryTags: z.preprocess(
    (val) => Array.isArray(val) ? val : typeof val === 'string' ? [val] : [],
    z.array(z.string()).min(1, 'Select at least one dietary tag')
  ),
  price: z.coerce.number().min(1, 'Price must be at least 1'),
  description: z.string().optional(),
  image: z.any().optional(), // multer: file or string, optional
});

export type DishInput = z.infer<typeof dishSchema>;
