import { useMemo, useState, type FormEvent } from 'react';
import { ArrowUpRight, Star } from 'lucide-react';
import type { CustomerReview, ReviewSummary, ShopDetails } from '../types.ts';
import { validateReviewInput } from '../utils/tailoring.ts';
import { publishNewReviewToRtdb } from '../utils/firebaseRtdb.ts';

interface ReviewsSectionProps {
  reviews: CustomerReview[];
  reviewSummary: ReviewSummary;
  shopDetails: ShopDetails;
  onReviewAdded: (review: CustomerReview, summary?: ReviewSummary) => void;
}

const SERVICE_CHOICES = [
  'Designer Blouse & Matching Astar',
  'Prince Cut / Alite Cut Blouse',
  'Salwar Suit & Alia Cut Kurti',
  'Bridal Lehenga & Choli',
  'Saree Fall, Pico & Alterations',
];

export function ReviewsSection({
  reviews,
  reviewSummary,
  shopDetails,
  onReviewAdded,
}: ReviewsSectionProps) {
  const [sourceFilter, setSourceFilter] = useState<'All' | CustomerReview['source']>('All');
  const [showForm, setShowForm] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState(5);
  const [service, setService] = useState(SERVICE_CHOICES[0]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const visibleReviews = useMemo(() => reviews.filter((r) => r.visible !== false), [reviews]);

  const filteredReviews = useMemo(() => {
    if (sourceFilter === 'All') return visibleReviews;
    return visibleReviews.filter((r) => r.source === sourceFilter);
  }, [visibleReviews, sourceFilter]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    const check = validateReviewInput({ customerName, rating, service, comment });
    if (!check.valid) {
      setFormError(check.error || 'Please check your review details.');
      return;
    }

    setSubmitting(true);
    try {
      const reviewInput = {
        customerName: customerName.trim(),
        rating: Number(rating),
        service: service.trim(),
        comment: comment.trim(),
      };

      // Write directly to Firebase RTDB (/reviews) using push()/set() without requiring login
      const rtdbResult = await publishNewReviewToRtdb(reviewInput);
      let created = rtdbResult.review;
      let serverSummary: ReviewSummary | undefined;

      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: created.id,
            createdAt: created.createdAt,
            visitDate: created.visitDate,
            syncedToRtdb: rtdbResult.ok,
            ...reviewInput,
          }),
        });
        const data = (await res.json()) as {
          review?: CustomerReview;
          reviewSummary?: ReviewSummary;
        };
        if (res.ok && data.review) {
          created = data.review;
          serverSummary = data.reviewSummary;
        } else if (!rtdbResult.ok) {
          setFormError('Could not save your review right now. Please try again.');
          return;
        }
      } catch {
        if (!rtdbResult.ok) {
          setFormError('Network error while saving your review.');
          return;
        }
      }

      onReviewAdded(created, serverSummary);
      setSourceFilter('All');
      setCustomerName('');
      setRating(5);
      setComment('');
      setShowForm(false);
    } catch {
      setFormError('Network error while saving your review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="reviews" className="py-16 sm:py-20 border-b border-stone-200 bg-[#FAF8F6]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-rose-800">Verified Customer Feedback</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-stone-950 tracking-tight [text-wrap:balance]">
              Trusted across Rajarhat and New Town.
            </h2>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-stone-700">
              <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-stone-950">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                {reviewSummary.averageRating.toFixed(1)} / 5.0 Rating
              </span>
              <span aria-hidden="true" className="text-stone-400">·</span>
              <a
                href={shopDetails.googleBusinessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-rose-800 hover:underline"
              >
                <span>Open Google Business Profile</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={shopDetails.googleBusinessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-900 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Read Live Google Reviews</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => {
                setShowForm((prev) => !prev);
              }}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              {showForm ? 'Close Review Form' : 'Write a Review'}
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={(e) => void handleSubmit(e)} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-semibold text-stone-950">Share Your Stitching Experience</h3>
              <span className="text-xs text-stone-500">Published directly to customer reviews</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="rev-name" className="block text-xs font-semibold text-stone-700 mb-1">
                  Your Name
                </label>
                <input
                  id="rev-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Subhashree Sen"
                  className="w-full px-3.5 py-2 border border-stone-300 focus:border-rose-800 rounded-lg text-sm outline-none"
                />
              </div>

              <div>
                <label htmlFor="rev-service" className="block text-xs font-semibold text-stone-700 mb-1">
                  Service Taken
                </label>
                <select
                  id="rev-service"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3.5 py-2 border border-stone-300 focus:border-rose-800 rounded-lg text-sm outline-none bg-white"
                >
                  {SERVICE_CHOICES.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rev-rating" className="block text-xs font-semibold text-stone-700 mb-1">
                  Rating
                </label>
                <select
                  id="rev-rating"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full px-3.5 py-2 border border-stone-300 focus:border-rose-800 rounded-lg text-sm outline-none bg-white"
                >
                  <option value={5}>5 Stars — Excellent Fitting</option>
                  <option value={4}>4 Stars — Very Good</option>
                  <option value={3}>3 Stars — Good</option>
                  <option value={2}>2 Stars — Fair</option>
                  <option value={1}>1 Star — Needs Improvement</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="rev-comment" className="block text-xs font-semibold text-stone-700 mb-1">
                Your Review
              </label>
              <textarea
                id="rev-comment"
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell others about the blouse/suit fit, fabric matching, or delivery timing..."
                className="w-full px-3.5 py-2 border border-stone-300 focus:border-rose-800 rounded-lg text-sm outline-none"
              />
            </div>

            {formError && (
              <p role="alert" className="text-sm text-rose-700 font-medium">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-stone-300 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-rose-800 hover:bg-rose-900 disabled:opacity-60 text-white rounded-lg text-sm font-semibold"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}

        {/* Filter bar (functional segmented tabs) */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-200/70 rounded-lg max-w-full w-fit">
          {(['All', 'Google Business Profile', 'Justdial Verified', 'Website Customer'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSourceFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                sourceFilter === tab ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredReviews.map((review) => (
            <article key={review.id} className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                  <span>
                    {review.source} · {review.visitDate}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-stone-900">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {review.rating}.0
                  </span>
                </div>

                <p className="text-sm text-stone-800 leading-relaxed">“{review.comment}”</p>
              </div>

              <div className="space-y-3 pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-950">{review.customerName}</span>
                  <span className="text-stone-500">{review.service}</span>
                </div>

                {review.ownerReply && (
                  <p className="text-xs text-stone-600 bg-[#FAF8F6] px-3 py-2 rounded-lg">
                    <strong className="text-stone-900">Shop reply:</strong> {review.ownerReply}
                  </p>
                )}
              </div>
            </article>
          ))}

          {filteredReviews.length === 0 && (
            <div className="md:col-span-2 bg-white rounded-2xl border border-stone-200 p-8 text-center text-sm text-stone-600">
              No reviews in this source filter yet.{' '}
              <button
                type="button"
                onClick={() => setSourceFilter('All')}
                className="font-semibold text-rose-800 hover:underline"
              >
                Show all reviews
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
