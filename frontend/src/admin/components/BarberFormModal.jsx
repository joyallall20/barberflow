import { useEffect, useState, useRef } from "react";
import { X, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadBarberPhoto } from "../../services/admin.js";

const EMPTY_FORM = {
  name: "",
  email: "",
  bio: "",
  specialties: "",
};

const BarberFormModal = ({ barber, onClose, onSubmit }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const isEditing = Boolean(barber);

  useEffect(() => {
    if (!barber) {
      setForm(EMPTY_FORM);
      setPhotoPreview(null);
      return;
    }

    setForm({
      name: barber.name ?? "",
      email: barber.email ?? "",
      bio: barber.bio ?? "",
      specialties: barber.specialties ? barber.specialties.join(", ") : "",
    });
    setPhotoPreview(barber.photo?.url ?? null);
  }, [barber]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const email = form.email.trim();
    const bio = form.bio.trim();
    const specialtiesArray = form.specialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (name.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    if (!isEditing && !email) {
      setError("Email is required.");
      return;
    }

    const payload = {
      name,
      bio,
      specialties: specialtiesArray,
    };

    if (!isEditing) {
      payload.email = email;
    }

    try {
      setSubmitting(true);
      const savedBarber = await onSubmit(payload, barber?._id ?? barber?.id);
      
      const barberId = savedBarber?.data?._id || savedBarber?.data?.id || barber?._id || barber?.id;

      if (photoFile && barberId) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        try {
          await uploadBarberPhoto(barberId, formData);
        } catch (photoErr) {
          toast.error("Barber saved, but photo upload failed.");
          console.error(photoErr);
        }
      }
      
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to save barber."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/70"
        onClick={submitting ? undefined : onClose}
      />

      <div className="relative z-10 w-full max-w-xl border border-white/10 bg-[#141311] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5 sticky top-0 bg-[#141311] z-10">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-500">
              Team
            </div>

            <h2 className="mt-1 text-xl font-extrabold uppercase tracking-tight text-[#e8e2d6]">
              {isEditing ? "Edit Barber" : "New Barber"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center border border-white/10 text-[#8f897e] transition-colors hover:border-amber-500 hover:text-amber-500 disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs leading-relaxed text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center mb-6">
            <div 
              className="w-24 h-24 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-[#0f0e0d] overflow-hidden mb-3 cursor-pointer relative group"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload size={20} className="text-white" />
                  </div>
                </>
              ) : (
                <Upload size={24} className="text-[#625f58] group-hover:text-amber-500 transition-colors" />
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoChange} 
              accept="image/*" 
              className="hidden" 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] uppercase tracking-[0.1em] text-amber-500 hover:text-amber-400"
            >
              {photoPreview ? "Change Photo" : "Upload Photo"}
            </button>
          </div>

          <div>
            <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
              Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              maxLength={100}
              required
              placeholder="John Doe"
              className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none transition-colors placeholder:text-[#625f58] focus:border-amber-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
              Email {isEditing && "(Read-only)"}
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              maxLength={254}
              required={!isEditing}
              disabled={isEditing}
              placeholder="john@example.com"
              className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none transition-colors placeholder:text-[#625f58] focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
              Bio
            </label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              maxLength={500}
              rows={3}
              placeholder="Expert barber with 10 years of experience..."
              className="w-full resize-none border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none transition-colors placeholder:text-[#625f58] focus:border-amber-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8f897e]">
              Specialties (Comma Separated)
            </label>
            <input
              name="specialties"
              value={form.specialties}
              onChange={handleChange}
              placeholder="Fades, Beard Trims, Styling"
              className="w-full border border-white/10 bg-[#0f0e0d] px-4 py-3 text-sm text-[#e8e2d6] outline-none transition-colors placeholder:text-[#625f58] focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="border border-white/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8f897e] transition-colors hover:border-white/30 hover:text-[#e8e2d6] disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="border border-amber-500 bg-amber-500 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-transparent hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : isEditing
                  ? "Update Barber"
                  : "Create Barber"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BarberFormModal;
