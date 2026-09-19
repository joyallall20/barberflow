import { Link } from "react-router-dom";

const BookingSuccess = () => {
  return (
    <section className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 text-white">
      <div className="text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
          Appointment Confirmed
        </p>

        <h1 className="text-5xl font-black uppercase">
          You're Booked.
        </h1>

        <p className="mt-5 text-neutral-500">
          Your appointment details will appear here.
        </p>

        <Link
          to="/"
          className="mt-8 inline-block border border-white px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] transition hover:bg-white hover:text-black"
        >
          Back Home
        </Link>
      </div>
    </section>
  );
};

export default BookingSuccess;