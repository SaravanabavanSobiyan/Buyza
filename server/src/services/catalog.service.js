export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORTS = {
  relevance: { score: -1, createdAt: -1, _id: -1 },
  newest: { createdAt: -1, _id: -1 },
  bestselling: { soldCount: -1, createdAt: -1, _id: -1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  name_asc: { name: 1, _id: 1 },
};

export function resolveSort(sort, search) {
  if (!search) return sort && sort !== "relevance" ? sort : "newest";
  return sort || "relevance";
}

export const searchTerms = (search) => (search ? search.split(/\s+/).filter(Boolean).slice(0, 6) : []);

export function buildMatch({ categoryIds, brandIds, minPrice, maxPrice, inStock, featured, search }) {
  const match = { isActive: true, isDeleted: false };

  if (categoryIds) match.category = { $in: categoryIds };
  if (brandIds) match.brand = { $in: brandIds };
  if (featured) match.isFeatured = true;
  if (minPrice !== undefined || maxPrice !== undefined) {
    match.price = {
      ...(minPrice !== undefined && { $gte: minPrice }),
      ...(maxPrice !== undefined && { $lte: maxPrice }),
    };
  }
  if (inStock) match.stock = { $gt: 0 };

  const terms = searchTerms(search);
  if (terms.length) {
    match.$and = terms.map((term) => {
      const pattern = new RegExp(escapeRegex(term), "i");
      return { $or: [{ name: pattern }, { tags: pattern }, { description: pattern }] };
    });
  }

  return match;
}

export function buildListingPipeline({ match, sort, search, page, limit }) {
  const phrase = escapeRegex(search || "");

  const scoreStage =
    sort === "relevance"
      ? [
          {
            $addFields: {
              score: {
                $switch: {
                  branches: [
                    { case: { $regexMatch: { input: "$name", regex: `^${phrase}`, options: "i" } }, then: 3 },
                    { case: { $regexMatch: { input: "$name", regex: phrase, options: "i" } }, then: 2 },
                  ],
                  default: 1,
                },
              },
            },
          },
        ]
      : [];

  return [
    { $match: match },
    ...scoreStage,
    {
      $facet: {
        items: [
          { $sort: SORTS[sort] },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "categoryDoc" } },
          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              price: 1,
              salePrice: 1,
              stock: 1,
              lowStockThreshold: 1,
              ratingAvg: 1,
              ratingCount: 1,
              image: { $arrayElemAt: ["$images.url", 0] },
              category: {
                $arrayElemAt: [
                  {
                    $map: {
                      input: "$categoryDoc",
                      as: "category",
                      in: { name: "$$category.name", slug: "$$category.slug" },
                    },
                  },
                  0,
                ],
              },
            },
          },
        ],
        total: [{ $count: "n" }],
      },
    },
  ];
}

export function toProductDetail(product, { brand, category, parent }) {
  const variants = (product.variants || []).map((variant) => ({
    sku: variant.sku,
    attributes: variant.attributes || {},
    price: variant.price ?? product.price,
    stock: variant.stock ?? 0,
  }));

  return {
    id: product._id,
    name: product.name,
    slug: product.slug,
    description: product.description || "",
    sku: product.sku || "",
    price: product.price,
    salePrice: product.salePrice ?? null,
    images: (product.images || []).map((image) => image.url).filter(Boolean),
    brand,
    category,
    parent,
    stock: variants.length ? variants.reduce((sum, variant) => sum + variant.stock, 0) : product.stock || 0,
    lowStockThreshold: product.lowStockThreshold ?? 5,
    variants,
    ratingAvg: product.ratingAvg ?? 0,
    ratingCount: product.ratingCount ?? 0,
    ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...(product.ratingBreakdown || {}) },
    seo: { title: product.seo?.title || "", description: product.seo?.description || "" },
  };
}

export const stockStatus = (product) => (product.stock <= 0 ? "out" : product.stock <= product.lowStockThreshold ? "low" : "in");

export const toCard = (product) => ({
  id: product._id,
  name: product.name,
  slug: product.slug,
  price: product.price,
  salePrice: product.salePrice ?? null,
  image: product.image ?? product.images?.[0]?.url ?? null,
  stockStatus: stockStatus(product),
  ratingAvg: product.ratingAvg ?? 0,
  ratingCount: product.ratingCount ?? 0,
  category: product.category?.name ? { name: product.category.name, slug: product.category.slug } : null,
});

export const HOME_LIMIT = 8;
const visible = { isActive: true, isDeleted: false };
export const HOME_SECTIONS = {
  featured: { filter: { ...visible, isFeatured: true }, sort: { createdAt: -1, _id: -1 } },
  newArrivals: { filter: visible, sort: { createdAt: -1, _id: -1 } },
  bestSellers: { filter: { ...visible, soldCount: { $gt: 0 } }, sort: { soldCount: -1, createdAt: -1, _id: -1 } },
  popularPicks: { filter: visible, sort: { isFeatured: -1, createdAt: -1, _id: -1 } },
};
