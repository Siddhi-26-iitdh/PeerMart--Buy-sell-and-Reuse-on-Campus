export type ApiImageRecord = {
  image_id: number;
  listing_id: number;
  image_path: string;
  display_order: number;
};

export type ApiProduct = {
  id: number;
  sellerId: number;
  sellerName: string;
  categoryId: number;
  title: string;
  description?: string;
  price: string;
  numericPrice: number;
  condition: "New" | "Used";
  category: string;
  brand?: string | null;
  color?: string | null;
  image: string;
  images: string[];
  imageRecords: ApiImageRecord[];
  status?: "Available" | "Reserved" | "Sold";
  createdAt?: string;
};

type Listing = {
  listing_id: number;
  seller_id: number;
  seller_name?: string | null;
  category_id: number;
  title: string;
  description?: string;
  price: string;
  item_condition: string;
  brand?: string | null;
  color?: string | null;
  status: string;
  created_at?: string;
};

export type CategoryItem = {
  category_id: number;
  category_name: string;
};

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};

async function fetchAllPages<T>(
  endpoint: string,
  pageSize = 50,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  while (true) {
    const separator = endpoint.includes("?") ? "&" : "?";

    const response = await fetch(
      `${endpoint}${separator}page=${page}&size=${pageSize}`,
      { credentials: "same-origin" },
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${endpoint}`);
    }

    const data: PaginatedResponse<T> = await response.json();

    items.push(...data.items);

    if (items.length >= data.total || data.items.length === 0) {
      break;
    }

    page += 1;
  }

  return items;
}

export async function fetchCategories(): Promise<CategoryItem[]> {
  return fetchAllPages<CategoryItem>("/api/categories", 50);
}

export async function fetchProducts(
  categoryImages: Record<string, string>,
): Promise<ApiProduct[]> {
  const [listings, categories, listingImages] = await Promise.all([
    fetchAllPages<Listing>("/api/listings", 50),
    fetchAllPages<CategoryItem>("/api/categories", 50),
    fetchAllPages<ApiImageRecord>("/api/listing-images", 100),
  ]);

  const categoryNames = new Map(
    categories.map((category) => [
      category.category_id,
      category.category_name,
    ]),
  );

  const imagesByListing = new Map<number, ApiImageRecord[]>();

  for (const image of listingImages) {
    const images = imagesByListing.get(image.listing_id) ?? [];
    images.push(image);
    imagesByListing.set(image.listing_id, images);
  }

  return listings.map((listing) => {
    const category =
      categoryNames.get(listing.category_id) ?? "Other";

    const sortedRecords = (imagesByListing.get(listing.listing_id) ?? []).sort(
      (a, b) => a.display_order - b.display_order,
    );
    const images = sortedRecords.map((image) => image.image_path);
    const numericPrice = Number(listing.price);

    return {
      id: listing.listing_id,
      sellerId: listing.seller_id,
      sellerName: listing.seller_name || `Campus Seller #${listing.seller_id}`,
      categoryId: listing.category_id,
      title: listing.title,
      description: listing.description,
      price: `₹${numericPrice.toLocaleString("en-IN")}`,
      numericPrice,
      condition:
        listing.item_condition.toLowerCase() === "new"
          ? "New"
          : "Used",
      category,
      brand: listing.brand,
      color: listing.color,
      image:
        images[0] ??
        categoryImages[category] ??
        categoryImages["Other"] ??
        "",
      images,
      imageRecords: sortedRecords,
      status:
        listing.status.toLowerCase() === "sold"
          ? "Sold"
          : listing.status.toLowerCase() === "reserved"
            ? "Reserved"
            : "Available",
      createdAt: listing.created_at,
    };
  });
}
