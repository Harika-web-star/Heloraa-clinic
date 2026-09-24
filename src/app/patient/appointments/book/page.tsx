"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Doctor = {
  id: string;
  specialization: string;
  experience_years: number;
  profiles: {
    full_name: string;
  } | null;
};

export default function BookAppointmentPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [doctorId, setDoctorId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [reason, setReason] = useState("");

  const [loadingDoctors, setLoadingDoctors] =
    useState(true);

  const [booking, setBooking] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Load doctors
  // --------------------------------------------------

  useEffect(() => {
    async function loadDoctors() {
      try {
        setError("");

        const response = await fetch("/api/doctors");

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to load doctors"
          );
        }

        setDoctors(data.doctors || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load doctors"
        );
      } finally {
        setLoadingDoctors(false);
      }
    }

    loadDoctors();
  }, []);

  // --------------------------------------------------
  // Book appointment
  // --------------------------------------------------

  async function bookAppointment() {
    setMessage("");
    setError("");

    if (
      !doctorId ||
      !appointmentDate ||
      !appointmentTime
    ) {
      setError(
        "Please select a doctor, date and time."
      );

      return;
    }

    setBooking(true);

    try {
      const response = await fetch(
        "/api/ai/appointments",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            doctorId,
            appointmentDate,
            appointmentTime,
            appointmentType: "consultation",
            reason:
              reason.trim() ||
              "General consultation",
          }),
        }
      );

      const raw = await response.text();

      let data: { error?: string; confirmation?: string } = {};

      try {
        data = raw ? JSON.parse(raw) as typeof data : {};
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Booking failed"
        );
      }

      setMessage(
        data.confirmation ||
          `Appointment scheduled successfully for ${appointmentDate} at ${appointmentTime}.`
      );

      setDoctorId("");
      setAppointmentDate("");
      setAppointmentTime("");
      setReason("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Booking failed"
      );
    } finally {
      setBooking(false);
    }
  }

  // --------------------------------------------------
  // Minimum date = today
  // --------------------------------------------------

  const today = new Date()
    .toISOString()
    .split("T")[0];

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-6 py-8 md:px-10">
      <div className="mx-auto max-w-3xl">

        {/* ------------------------------------------------ */}
        {/* Back */}
        {/* ------------------------------------------------ */}

        <Link
          href="/patient/appointments"
          className="inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-[#0A0D14]"
        >
          ← Back to Appointments
        </Link>

        {/* ------------------------------------------------ */}
        {/* Header */}
        {/* ------------------------------------------------ */}

        <div className="mt-6">
          <p className="text-sm font-medium text-slate-500">
            Heloraa Clinic
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0A0D14]">
            Book a Consultation
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Choose a doctor and appointment time.
          </p>
        </div>

        {/* ------------------------------------------------ */}
        {/* Booking Card */}
        {/* ------------------------------------------------ */}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">

          <div className="space-y-6">

            {/* Doctor */}
            <div>
              <label
                htmlFor="doctor"
                className="text-sm font-medium text-slate-700"
              >
                Doctor
              </label>

              <select
                id="doctor"
                value={doctorId}
                onChange={(e) =>
                  setDoctorId(e.target.value)
                }
                disabled={loadingDoctors || booking}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">
                  {loadingDoctors
                    ? "Loading doctors..."
                    : "Select a doctor"}
                </option>

                {doctors.map((doctor) => {
                  const name =
                    doctor.profiles?.full_name ||
                    "Doctor";

                  const displayName =
                    name.startsWith("Dr.")
                      ? name
                      : `Dr. ${name}`;

                  return (
                    <option
                      key={doctor.id}
                      value={doctor.id}
                    >
                      {displayName} —{" "}
                      {doctor.specialization}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Date */}
            <div>
              <label
                htmlFor="appointment-date"
                className="text-sm font-medium text-slate-700"
              >
                Date
              </label>

              <input
                id="appointment-date"
                type="date"
                min={today}
                value={appointmentDate}
                onChange={(e) =>
                  setAppointmentDate(e.target.value)
                }
                disabled={booking}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {/* Time */}
            <div>
              <label
                htmlFor="appointment-time"
                className="text-sm font-medium text-slate-700"
              >
                Time
              </label>

              <input
                id="appointment-time"
                type="time"
                value={appointmentTime}
                onChange={(e) =>
                  setAppointmentTime(e.target.value)
                }
                disabled={booking}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {/* Reason */}
            <div>
              <label
                htmlFor="reason"
                className="text-sm font-medium text-slate-700"
              >
                Reason for consultation
              </label>

              <textarea
                id="reason"
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value)
                }
                placeholder="Briefly describe why you want to consult the doctor..."
                rows={4}
                disabled={booking}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm leading-6 text-red-700">
                  {error}
                </p>
              </div>
            )}

            {/* Success */}
            {message && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm leading-6 text-slate-700">
                  {message}
                </p>

                <Link
                  href="/patient/appointments"
                  className="mt-4 inline-flex text-sm font-medium text-[#0A0D14] underline underline-offset-4"
                >
                  View my appointments →
                </Link>
              </div>
            )}

            {/* Book Button */}
            <button
              onClick={bookAppointment}
              disabled={booking || loadingDoctors}
              className="w-full rounded-xl bg-[#0A0D14] px-5 py-3.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {booking
                ? "Booking..."
                : "Book Appointment"}
            </button>

          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* Information */}
        {/* ------------------------------------------------ */}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-[#0A0D14]">
            Appointment information
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Please select a future date and a suitable
            consultation time. Your appointment confirmation
            will also appear in your Heloraa Clinic
            notifications.
          </p>
        </div>

      </div>
    </main>
  );
}
