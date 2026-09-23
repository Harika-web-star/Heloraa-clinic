"use client";

import { useEffect, useState } from "react";

type Doctor = {
  id: string;
  specialization: string;
  experience_years: number;
  profiles: {
    full_name: string;
  } | null;
};

export default function PatientAppointmentsPage() {
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

  useEffect(() => {
    async function loadDoctors() {
      try {
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
        "/api/ai/appointment",
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
              reason || "General consultation",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Booking failed"
        );
      }

      setMessage(data.confirmation);

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

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div>
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

        {/* Booking Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          <div className="space-y-6">

            {/* Doctor */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Doctor
              </label>

              <select
                value={doctorId}
                onChange={(e) =>
                  setDoctorId(e.target.value)
                }
                disabled={loadingDoctors}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
              >
                <option value="">
                  {loadingDoctors
                    ? "Loading doctors..."
                    : "Select a doctor"}
                </option>

                {doctors.map((doctor) => (
                  <option
                    key={doctor.id}
                    value={doctor.id}
                  >
                    Dr.{" "}
                    {doctor.profiles?.full_name} —{" "}
                    {doctor.specialization}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Date
              </label>

              <input
                type="date"
                value={appointmentDate}
                onChange={(e) =>
                  setAppointmentDate(e.target.value)
                }
                min={
                  new Date()
                    .toISOString()
                    .split("T")[0]
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            {/* Time */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Time
              </label>

              <input
                type="time"
                value={appointmentTime}
                onChange={(e) =>
                  setAppointmentTime(e.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Reason for consultation
              </label>

              <textarea
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value)
                }
                placeholder="Briefly describe why you want to consult the doctor..."
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Success */}
            {message && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {message}
              </div>
            )}

            {/* Button */}
            <button
              onClick={bookAppointment}
              disabled={booking}
              className="w-full rounded-xl bg-[#0A0D14] px-5 py-3.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {booking
                ? "Booking..."
                : "Book Appointment"}
            </button>

          </div>
        </div>
      </div>
    </main>
  );
}