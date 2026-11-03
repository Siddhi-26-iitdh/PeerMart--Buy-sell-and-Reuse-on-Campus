export type ApiProduct = {
  id: number;
  title: string;
  description?: string;
  price: string;
  condition: "New" | "Used";
  category: string;
  image: string;
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

export async function fetchProducts(
  categoryImages: Record<string, string>,
): Promise<ApiProduct[]> {
  const [listingsResponse, categoriesResponse] = await Promise.all([
    fetch("/api/listings?page=1&size=100"),
    fetch("/api/categories?page=1&size=10"),
  ]);

  if (!listingsResponse.ok || !categoriesResponse.ok) {
    throw new Error("Could not load products from PeerMart API");
  }

  const listingsData: { items: Listing[] } = await listingsResponse.json();
  const categoriesData: { items: Category[] } = await categoriesResponse.json();

  const categoryNames = new Map(
    categoriesData.items.map((category) => [
      category.category_id,
      category.category_name,
    ]),
  );

  return listingsData.items.map((listing) => {
    const category = categoryNames.get(listing.category_id) ?? "Other";

    return {
      id: listing.listing_id,
      title: listing.title,
      description: listing.description,
      price: `₹${Number(listing.price).toLocaleString("en-IN")}`,
      condition: listing.item_condition.toLowerCase() === "new" ? "New" : "Used",
      category,
      image: categoryImages[category] ?? categoryImages["Other"] ?? "",
      status:
        listing.status.toLowerCase() === "sold"
          ? "Sold"
          : listing.status.toLowerCase() === "reserved"
            ? "Reserved"
            : "Available",
    };
  });
}
