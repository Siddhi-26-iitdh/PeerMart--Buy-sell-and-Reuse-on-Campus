export type ApiProduct = {
  id: number;
  title: string;
  description?: string;
  price: string;
  condition: "New" | "Used";
  category: string;
  image: string;
  images: string[];
  status?: "Available" | "Reserved" | "Sold";
};

type Listing = {
  listing_id: number;
  category_id: number;
  title: string;
  description?: string;
  price: string;
  item_condition: string;
  status: string;
};

type Category = {
  category_id: number;
  category_name: string;
};

type ListingImage = {
  image_id: number;
  listing_id: number;
  image_path: string;
  display_order: number;
};

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};

async function fetchAllPages<T>(
  endpoint: string,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  while (true) {
    const separator = endpoint.includes("?") ? "&" : "?";

    const response = await fetch(
      `${endpoint}${separator}page=${page}&size=10`,
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

export async function fetchProducts(
  categoryImages: Record<string, string>,
): Promise<ApiProduct[]> {
  const [listings, categories, listingImages] = await Promise.all([
    fetchAllPages<Listing>("/api/listings"),
    fetchAllPages<Category>("/api/categories"),
    fetchAllPages<ListingImage>("/api/listing-images"),
  ]);

  const categoryNames = new Map(
    categories.map((category) => [
      category.category_id,
      category.category_name,
    ]),
  );

  const imagesByListing = new Map<number, ListingImage[]>();

  for (const image of listingImages) {
    const images = imagesByListing.get(image.listing_id) ?? [];
    images.push(image);
    imagesByListing.set(image.listing_id, images);
  }

  return listings.map((listing) => {
    const category =
      categoryNames.get(listing.category_id) ?? "Other";

    const images = (imagesByListing.get(listing.listing_id) ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((image) => image.image_path);

    return {
      id: listing.listing_id,
      title: listing.title,
      description: listing.description,
      price: `₹${Number(listing.price).toLocaleString("en-IN")}`,
      condition:
        listing.item_condition.toLowerCase() === "new"
          ? "New"
          : "Used",
      category,
      image:
        images[0] ??
        categoryImages[category] ??
        categoryImages["Other"] ??
        "",
      images,
      status:
        listing.status.toLowerCase() === "sold"
          ? "Sold"
          : listing.status.toLowerCase() === "reserved"
            ? "Reserved"
            : "Available",
    };
  });
}
