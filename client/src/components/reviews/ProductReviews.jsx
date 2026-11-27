import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchEligibility, fetchReviews, submitReview, updateReview, deleteReview } from "../../api/reviews";
import RatingSummary from "./RatingSummary";
import ReviewCard from "./ReviewCard";
import ReviewForm from "./ReviewForm";
import ReviewList from "./ReviewList";
import { showErrorToast } from "../../utils/showErrorToast";

export default function ProductReviews({ productId, onChanged }) {
  const userId = useSelector((s) => s.auth.user?.id || s.auth.user?._id);
  const location = useLocation();

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("newest");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eligibilityState, setEligibilityState] = useState(null);
  const [mode, setMode] = useState("idle");
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const sectionRef = useRef(null);
  const scrolled = useRef(false);

  useEffect(() => {
    let alive = true;
    fetchReviews(productId, { page, limit: 5, sort })
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError("");
      })
      .catch((e) => alive && setError(e.response?.data?.message || "Could not load reviews"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [productId, page, sort, refreshKey]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }
    let alive = true;
    fetchEligibility(productId)
      .then((data) => alive && setEligibilityState({ userId, productId, data }))
      .catch(() => alive && setEligibilityState({ userId, productId, data: null }));
    return () => {
      alive = false;
    };
  }, [productId, userId, refreshKey]);

  const elig =
    eligibilityState?.userId === userId && eligibilityState?.productId === productId
      ? eligibilityState.data
      : null;

  useEffect(() => {
    if (data && !scrolled.current && location.hash === "#reviews") {
      scrolled.current = true;
      sectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [data, location.hash]);

  const changed = () => {
    setRefreshKey((k) => k + 1);
    onChanged?.();
  };

  const handleCreate = async (formData) => {
    setSubmitting(true);
    try {
      await submitReview(productId, formData);
      toast.success("Thanks for your review!");
      setMode("idle");
      setPage(1);
      setSort("newest");
      changed();
    } catch (e) {
      showErrorToast(e, "Could not submit your review");
      if ([403, 409].includes(e.response?.status)) {
        setMode("idle");
        setRefreshKey((k) => k + 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (formData) => {
    setSubmitting(true);
    try {
      await updateReview(productId, elig.myReview._id, formData);
      toast.success("Review updated");
      setMode("idle");
      changed();
    } catch (e) {
      showErrorToast(e, "Could not update your review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete your review? This cannot be undone.")) return;
    try {
      await deleteReview(productId, elig.myReview._id);
      toast.success("Review deleted");
      setPage(1);
      changed();
    } catch (e) {
      showErrorToast(e, "Could not delete your review");
    }
  };

  const renderAction = () => {
    if (!userId) {
      return (
        <p className="text-sm text-gray-600">
          <Link to="/login" state={{ from: location }} className="font-medium text-indigo-600 underline">
            Log in
          </Link>{" "}
          to write a review.
        </p>
      );
    }
    if (!elig) return null;

    if (mode === "writing") {
      return <ReviewForm submitting={submitting} onSubmit={handleCreate} onCancel={() => setMode("idle")} />;
    }
    if (mode === "editing") {
      return <ReviewForm initial={elig.myReview} submitting={submitting} onSubmit={handleEdit} onCancel={() => setMode("idle")} />;
    }

    if (elig.canReview) {
      return (
        <button onClick={() => setMode("writing")} className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700">
          Write a review
        </button>
      );
    }

    if (elig.reason === "already_reviewed") {
      return (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Your review</h3>
          <ReviewCard
            review={elig.myReview}
            actions={
              <span className="flex gap-3">
                <button onClick={() => setMode("editing")} className="font-medium text-indigo-600 hover:underline">
                  Edit
                </button>
                <button onClick={handleDelete} className="font-medium text-red-600 hover:underline">
                  Delete
                </button>
              </span>
            }
          />
        </div>
      );
    }

    return <p className="text-sm text-gray-600">Only customers who bought and received this product can review it.</p>;
  };

  return (
    <section id="reviews" ref={sectionRef} className="scroll-mt-24 space-y-8 py-10">
      <h2 className="text-xl font-semibold">Ratings &amp; reviews</h2>
      <RatingSummary summary={data?.summary} />
      <div>{renderAction()}</div>
      <ReviewList
        data={data}
        loading={loading}
        error={error}
        sort={sort}
        onSortChange={(s) => {
          setSort(s);
          setPage(1);
        }}
        onPageChange={(p) => setPage(p)}
        onRetry={() => setRefreshKey((k) => k + 1)}
      />
    </section>
  );
}
