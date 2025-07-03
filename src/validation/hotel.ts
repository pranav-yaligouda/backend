import { z } from 'zod';

export const timingsSchema = z.record(
  z.object({
    open: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/), // HH:mm
    close: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    holiday: z.boolean(),
  })
);

export const locationSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().min(-180).max(180), // lng
    z.number().min(-90).max(90),   // lat
  ]),
  address: z.string().min(1),
});

export const hotelSchema = z.object({
  name: z.string().min(1),
  image: z.string().optional(), // image URL
  timings: timingsSchema,
  holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  location: locationSchema,
});

export type HotelInput = z.infer<typeof hotelSchema>;
