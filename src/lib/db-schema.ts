/**
 * Type definitions for the database schema
 * These types correspond to the tables defined in db.ts
 */

/**
 * User entity with authentication and permission details
 */
export interface User {
  id: number;
  username: string;
  password: string;
  isAdmin: boolean;
  created_at: string;
}

/**
 * Category entity for organizing boxes by room or purpose
 */
export interface Category {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

/**
 * Box entity for tracking physical boxes
 */
export interface Box {
  id: number;
  name: string;
  location: string | null;
  notes: string | null;
  number: number;
  category_id: number;
  created_at: string;
  updated_at: string;
}

/**
 * Item entity for representing individual items that can be stored in boxes
 */
export interface Item {
  id: number;
  name: string;
  category_id: number | null;
  created_at: string;
}

/**
 * BoxItem entity for the many-to-many relationship between boxes and items
 */
export interface BoxItem {
  id: number;
  box_id: number;
  item_id: number;
  quantity: number;
}

/**
 * Setting entity for application configuration and preferences
 */
export interface Setting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

/**
 * Extended Box interface with category information included
 * Used in UI for displaying box with its category details
 */
export interface BoxWithCategory extends Box {
  categoryName?: string;
  categoryColor?: string;
}

/**
 * Extended Item interface with additional information
 * Used in UI for displaying items with their box and category details
 */
export interface ItemWithDetails extends Item {
  boxId?: number;
  boxNumber?: number;
  boxName?: string;
  categoryName?: string;
  categoryColor?: string;
  quantity?: number;
}