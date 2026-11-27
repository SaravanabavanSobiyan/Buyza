import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminProduct, createProduct, updateProduct, uploadProductImages } from "../../api/adminProducts";
import { getAdminCategories, getAdminBrands } from "../../api/admin";
import { getErrorMessage, getFieldErrors } from "../../api/axios";
import { toMinor, fromMinor, isMoney } from "../../utils/money";
import FormField, { inputClass } from "../../components/FormField";
import Button from "../../components/Button";
import Alert from "../../components/Alert";

const MAX_IMAGES = 8;
const MAX_SIZE = 3 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

const parseOptions = (text) =>
  Object.fromEntries(
    text
      .split(",")
      .map((pair) => pair.split(":").map((s) => s.trim()))
      .filter(([k, v]) => k && v)
  );
const formatOptions = (obj) => Object.entries(obj || {}).map(([k, v]) => `${k}: ${v}`).join(", ");

const categoryOptions = (list) =>
  list
    .filter((c) => !c.parent)
    .flatMap((r) => [
      { id: r._id, label: r.name },
      ...list.filter((c) => c.parent === r._id).map((c) => ({ id: c._id, label: `${r.name} › ${c.name}` })),
    ]);

const Section = ({ title, children }) => (
  <section className="space-y-3 border-t border-gray-100 pt-5">
    <h3 className="font-medium">{title}</h3>
    {children}
  </section>
);

function ProductEditor({ product }) {
  const isEdit = Boolean(product);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({ queryKey: ["admin", "categories"], queryFn: getAdminCategories });
  const { data: brands = [] } = useQuery({ queryKey: ["admin", "brands"], queryFn: getAdminBrands });

  const [form, setForm] = useState({
    name: product?.name || "",
    description: product?.description || "",
    category: product?.category || "",
    brand: product?.brand || "",
    price: product ? fromMinor(product.price) : "",
    salePrice: product ? fromMinor(product.salePrice) : "",
    sku: product?.sku || "",
    stock: String(product?.stock ?? 0),
    lowStockThreshold: String(product?.lowStockThreshold ?? 5),
    tags: (product?.tags || []).join(", "),
    slug: product?.slug || "",
    seoTitle: product?.seo?.title || "",
    seoDescription: product?.seo?.description || "",
    isFeatured: product?.isFeatured ?? false,
    isActive: product?.isActive ?? true,
  });
  const [images, setImages] = useState(product?.images || []);
  const [variants, setVariants] = useState(
    (product?.variants || []).map((v) => ({
      sku: v.sku,
      options: formatOptions(v.attributes),
      price: fromMinor(v.price),
      stock: String(v.stock ?? 0),
    }))
  );
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [imageError, setImageError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    setErrors((er) => (er[name] ? { ...er, [name]: undefined } : er));
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    setImageError("");
    if (!files.length) return;
    if (images.length + files.length > MAX_IMAGES) return setImageError(`You can add up to ${MAX_IMAGES} images`);
    if (files.some((f) => !TYPES.includes(f.type) || f.size > MAX_SIZE)) {
      return setImageError("Images must be JPG, PNG or WebP, up to 3 MB each");
    }
    setUploading(true);
    try {
      const uploaded = await uploadProductImages(files);
      setImages((imgs) => [...imgs, ...uploaded]);
    } catch (err) {
      setImageError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const makeMain = (i) => setImages((imgs) => [imgs[i], ...imgs.filter((_, idx) => idx !== i)]);
  const removeImage = (i) => setImages((imgs) => imgs.filter((_, idx) => idx !== i));

  const addVariant = () => setVariants((vs) => [...vs, { sku: "", options: "", price: "", stock: "0" }]);
  const updateVariant = (i, field, value) => setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)));
  const removeVariant = (i) => setVariants((vs) => vs.filter((_, idx) => idx !== i));

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (!form.category) e.category = "Choose a category";
    if (!isMoney(form.price)) e.price = "Enter a price like 1290.00";
    if (form.salePrice && !isMoney(form.salePrice)) e.salePrice = "Enter a valid sale price";
    else if (form.salePrice && Number(form.salePrice) >= Number(form.price)) {
      e.salePrice = "Sale price must be less than the regular price";
    }
    if (!/^\d+$/.test(form.lowStockThreshold)) e.lowStockThreshold = "Enter a whole number";
    if (!variants.length && !/^\d+$/.test(form.stock)) e.stock = "Enter a whole number";

    const skus = variants.map((v) => v.sku.trim().toLowerCase());
    if (variants.some((v) => !v.sku.trim())) e.variants = "Every variant needs a SKU";
    else if (new Set(skus).size !== skus.length) e.variants = "Variant SKUs must be unique";
    else if (variants.some((v) => !/^\d+$/.test(v.stock) || (v.price && !isMoney(v.price)))) {
      e.variants = "Variant stock must be a whole number and price a valid amount";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    description: form.description.trim(),
    price: toMinor(form.price),
    salePrice: form.salePrice.trim() ? toMinor(form.salePrice) : null,
    category: form.category,
    brand: form.brand || null,
    sku: form.sku.trim(),
    stock: variants.length ? 0 : Number(form.stock),
    lowStockThreshold: Number(form.lowStockThreshold),
    tags: [...new Set(form.tags.split(",").map((t) => t.trim()).filter(Boolean))],
    images,
    variants: variants.map((v) => ({
      sku: v.sku.trim(),
      attributes: parseOptions(v.options),
      price: v.price.trim() ? toMinor(v.price) : null,
      stock: Number(v.stock),
    })),
    seo: { title: form.seoTitle.trim(), description: form.seoDescription.trim() },
    isFeatured: form.isFeatured,
    isActive: form.isActive,
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => (isEdit ? updateProduct({ id: product._id, ...payload }) : createProduct(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["catalog", "featured-products"] });
      navigate("/admin/products");
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    try {
      await saveMutation.mutateAsync(buildPayload());
    } catch (err) {
      setServerError(getErrorMessage(err));
      setErrors(getFieldErrors(err));
    }
  };

  const hasVariants = variants.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{isEdit ? "Edit product" : "Add product"}</h2>
        <Link to="/admin/products" className="text-sm text-gray-600 hover:underline">
          Back to products
        </Link>
      </div>

      <Alert>{serverError}</Alert>

      <FormField label="Name" name="name" value={form.name} onChange={handleChange} error={errors.name} />
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea id="description" name="description" rows={5} value={form.description} onChange={handleChange} className={inputClass()} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-700">
            Category
          </label>
          <select id="category" name="category" value={form.category} onChange={handleChange} className={inputClass(errors.category)}>
            <option value="">Choose a category</option>
            {categoryOptions(categories).map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
        </div>
        <div>
          <label htmlFor="brand" className="mb-1 block text-sm font-medium text-gray-700">
            Brand (optional)
          </label>
          <select id="brand" name="brand" value={form.brand} onChange={handleChange} className={inputClass()}>
            <option value="">No brand</option>
            {brands.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Section title="Pricing and stock">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Price (LKR)" name="price" inputMode="decimal" placeholder="1290.00" value={form.price} onChange={handleChange} error={errors.price} />
          <FormField label="Sale price (LKR, optional)" name="salePrice" inputMode="decimal" placeholder="990.00" value={form.salePrice} onChange={handleChange} error={errors.salePrice} />
          <FormField label="SKU (optional)" name="sku" value={form.sku} onChange={handleChange} error={errors.sku} />
          <FormField
            label="Stock"
            name="stock"
            inputMode="numeric"
            value={hasVariants ? String(variants.reduce((s, v) => s + (Number(v.stock) || 0), 0)) : form.stock}
            onChange={handleChange}
            error={errors.stock}
            disabled={hasVariants}
            hint={hasVariants ? "Calculated from variant stock." : undefined}
          />
          <FormField label="Low-stock alert at" name="lowStockThreshold" inputMode="numeric" value={form.lowStockThreshold} onChange={handleChange} error={errors.lowStockThreshold} />
        </div>
        <FormField label="Tags (comma separated)" name="tags" placeholder="wireless, audio" value={form.tags} onChange={handleChange} />
      </Section>

      <Section title="Images">
        <Alert>{imageError}</Alert>
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={img.publicId} className="w-28 text-xs">
              <div className="relative">
                <img src={img.url} alt="" className="h-28 w-28 rounded-lg border border-gray-200 object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-gray-900 px-1.5 py-0.5 text-white">Main</span>}
              </div>
              <div className="mt-1 flex justify-between">
                {i > 0 ? (
                  <button type="button" className="text-blue-600 hover:underline" onClick={() => makeMain(i)}>
                    Make main
                  </button>
                ) : (
                  <span />
                )}
                <button type="button" className="text-red-600 hover:underline" onClick={() => removeImage(i)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        {images.length < MAX_IMAGES && (
          <div>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} disabled={uploading} className="block text-sm" />
            <p className="mt-1 text-xs text-gray-500">
              {uploading ? "Uploading…" : `JPG, PNG or WebP, up to 3 MB each. ${images.length}/${MAX_IMAGES} added.`}
            </p>
          </div>
        )}
      </Section>

      <Section title="Variants (optional)">
        <p className="text-xs text-gray-500">
          Use variants for sizes, colours, etc. Options look like <code>Size: M, Color: Black</code>. Leave price empty to use the product price.
        </p>
        <Alert>{errors.variants}</Alert>
        {variants.map((v, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_1fr_90px_auto]">
            <input aria-label="Variant SKU" placeholder="SKU" value={v.sku} onChange={(e) => updateVariant(i, "sku", e.target.value)} className={inputClass()} />
            <input aria-label="Variant options" placeholder="Size: M, Color: Black" value={v.options} onChange={(e) => updateVariant(i, "options", e.target.value)} className={inputClass()} />
            <input aria-label="Variant price" placeholder="Price (optional)" inputMode="decimal" value={v.price} onChange={(e) => updateVariant(i, "price", e.target.value)} className={inputClass()} />
            <input aria-label="Variant stock" placeholder="Stock" inputMode="numeric" value={v.stock} onChange={(e) => updateVariant(i, "stock", e.target.value)} className={inputClass()} />
            <button type="button" onClick={() => removeVariant(i)} className="text-sm text-red-600 hover:underline">
              Remove
            </button>
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={addVariant}>
          Add variant
        </Button>
      </Section>

      <Section title="SEO">
        <FormField label="URL slug" name="slug" placeholder="auto-generated from the name" value={form.slug} onChange={handleChange} hint="Lowercase letters, numbers and dashes." />
        <FormField label="Meta title" name="seoTitle" maxLength={70} value={form.seoTitle} onChange={handleChange} />
        <FormField label="Meta description" name="seoDescription" maxLength={160} value={form.seoDescription} onChange={handleChange} />
      </Section>

      <Section title="Visibility">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
          Published (visible in the store)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} />
          Featured on the home page
        </label>
      </Section>

      <div className="flex gap-2 border-t border-gray-100 pt-5">
        <Button type="submit" loading={saveMutation.isPending} disabled={uploading}>
          {isEdit ? "Save changes" : "Create product"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => navigate("/admin/products")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "product", id],
    queryFn: () => getAdminProduct(id),
    enabled: Boolean(id),
    gcTime: 0,
  });

  if (id && isLoading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (id && isError) return <Alert>{getErrorMessage(error)}</Alert>;
  return <ProductEditor key={id || "new"} product={data} />;
}
