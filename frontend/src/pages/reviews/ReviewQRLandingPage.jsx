import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, Star, ArrowRight } from "lucide-react";
import reviewQRService from "../../services/reviewQRService";

const EASE = [0.22, 1, 0.36, 1];

const ReviewQRLandingPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [barber, setBarber] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("No QR token provided.");
      setLoading(false);
      return;
    }

    const resolveToken = async () => {
      try {
        setLoading(true);
        const response = await reviewQRService.resolve(token);
        setBarber(response.data.barber);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
          "This QR code is invalid, inactive, or has been regenerated."
        );
      } finally {
        setLoading(false);
      }
    };

    resolveToken();
  }, [token]);

const handleProceed = () => {
  if (!barber?.id) {
    setError("Unable to identify this barber. Please try scanning the QR code again.");
    return;
  }

  navigate("/my-appointments", {
    state: {
      reviewBarberId: barber.id,
      reviewFlow: true,
    },
  });
};

  return (
    <div className="min-h-screen bg-[#0f0e0d] text-[#e8e2d6] flex flex-col items-center py-20 px-4">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-500 mb-2">
            The Foundry
          </div>
          <h1 className="text-3xl font-extrabold uppercase leading-[0.95] tracking-tight">
            Leave a Review
          </h1>
        </div>

        {loading ? (
          <div className="border border-white/10 bg-[#141311] p-12 flex flex-col items-center justify-center">
            <RefreshCw className="animate-spin text-amber-500 mb-4" size={24} />
            <div className="text-xs uppercase tracking-[0.2em] text-[#8f897e]">
              Resolving QR Code...
            </div>
          </div>
        ) : error ? (
          <div className="border border-white/10 bg-[#141311] p-10 text-center">
            <div className="text-sm font-bold uppercase tracking-[0.15em] text-red-400 mb-3">
              Unavailable
            </div>
            <p className="text-xs leading-relaxed text-[#8f897e]">
              {error}
            </p>
          </div>
        ) : barber ? (
          <div className="border border-white/10 bg-[#141311] p-8 text-center flex flex-col items-center">
            {barber.photo?.url ? (
              <img 
                src={barber.photo.url} 
                alt={barber.name} 
                className="w-24 h-24 rounded-full object-cover border-2 border-white/10 mb-6" 
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#0f0e0d] border-2 border-white/10 flex items-center justify-center text-[#625f58] font-bold text-3xl mb-6">
                {barber.name.charAt(0)}
              </div>
            )}

            <h2 className="text-xl font-bold uppercase tracking-wide mb-2">
              {barber.name}
            </h2>
            
            {barber.specialties?.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {barber.specialties.map(spec => (
                  <span key={spec} className="inline-block bg-[#0f0e0d] px-3 py-1.5 text-[9px] uppercase tracking-wider text-amber-500/80 rounded border border-white/5">
                    {spec}
                  </span>
                ))}
              </div>
            )}

            {barber.bio && (
              <p className="text-xs text-[#a89f8f] mb-8 max-w-sm mx-auto leading-relaxed">
                {barber.bio}
              </p>
            )}

            <button
              onClick={handleProceed}
              className="w-full flex items-center justify-center gap-2 border border-amber-500 bg-amber-500 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-amber-500"
            >
              <Star size={14} />
              Write Review
              <ArrowRight size={14} />
            </button>
            <p className="mt-4 text-[9px] text-[#625f58] max-w-xs mx-auto">
              You will need to sign in and select your completed appointment to write a review.
            </p>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
};

export default ReviewQRLandingPage;
